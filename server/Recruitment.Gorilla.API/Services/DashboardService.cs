using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Read-only aggregations for the dashboard. All queries respect the caller's
/// owner scope (recruiters only see their own candidates) — pass null for no filter.
/// </summary>
public class DashboardService(AppDbContext db)
{
    // Exact seeded status strings (including the historical typos) — see AppDbContext seed.
    private static readonly HashSet<string> PositiveTerminal = ["Recommended"];
    private static readonly HashSet<string> NegativeTerminal =
        ["Reject", "Not Recommended", "Discontinued", "Not Available"];

    public async Task<DashboardDto> GetAsync(int? ownerUserId, int trendDays = 30)
    {
        var candidates = ownerUserId is int owner
            ? db.Candidates.Where(c => c.OwnerUserId == owner)
            : db.Candidates;

        // ---- Status breakdown (one grouped query; also feeds the KPI buckets) ----
        var counts = await candidates
            .GroupBy(c => c.CurrentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var order = await db.StatusOptions.ToDictionaryAsync(s => s.Name, s => s.SortOrder);

        var statusBreakdown = counts
            .Select(x => new StatusCountDto(
                x.Status, x.Count, order.TryGetValue(x.Status, out var so) ? so : int.MaxValue))
            .OrderBy(x => x.SortOrder)
            .ToList();

        // ---- KPIs ----
        var total = counts.Sum(x => x.Count);
        var recommended = counts.Where(x => PositiveTerminal.Contains(x.Status)).Sum(x => x.Count);
        var rejected = counts.Where(x => NegativeTerminal.Contains(x.Status)).Sum(x => x.Count);
        var inProcess = total - recommended - rejected;

        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var newThisWeek = await candidates.CountAsync(c => c.CreatedAt >= weekAgo);
        var referredCount = await candidates.CountAsync(c => c.IsReferred);
        var referredPercent = total == 0 ? 0 : Math.Round(referredCount * 100.0 / total, 1);

        var kpis = new DashboardKpisDto(
            total, inProcess, recommended, rejected, newThisWeek, referredCount, referredPercent);

        // ---- By role (configured option name, falling back to free-text AppliedRole) ----
        var byRole = (await candidates
                .Select(c => c.RoleAppliedOption != null ? c.RoleAppliedOption.Name : c.AppliedRole)
                .Where(r => r != null && r != "")
                .GroupBy(r => r!)
                .Select(g => new NameCountDto(g.Key, g.Count()))
                .ToListAsync())
            .OrderByDescending(x => x.Count)
            .ToList();

        // ---- Top skills ----
        // Group by the scalar FK (translatable on MySQL), then resolve names from a lookup —
        // grouping directly by the joined SkillOption.Name can't be translated by Pomelo.
        var skillCounts = await db.CandidateSkills
            .Where(cs => ownerUserId == null || cs.Candidate.OwnerUserId == ownerUserId)
            .GroupBy(cs => cs.SkillOptionId)
            .Select(g => new { SkillOptionId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(8)
            .ToListAsync();

        var skillNames = await db.SkillOptions.ToDictionaryAsync(s => s.Id, s => s.Name);
        var topSkills = skillCounts
            .Select(x => new NameCountDto(
                skillNames.TryGetValue(x.SkillOptionId, out var name) ? name : "Unknown", x.Count))
            .ToList();

        // ---- Applications trend (last N days, zero-filled for a continuous axis) ----
        var startDate = DateTime.UtcNow.Date.AddDays(-(trendDays - 1));
        var dailyCounts = await candidates
            .Where(c => c.CreatedAt >= startDate)
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var trend = Enumerable.Range(0, trendDays)
            .Select(i => startDate.AddDays(i))
            .Select(d => new TrendPointDto(
                d.ToString("yyyy-MM-dd"), dailyCounts.TryGetValue(d, out var n) ? n : 0))
            .ToList();

        // ---- Upcoming interviews (future only) ----
        var now = DateTime.UtcNow;
        var upcomingInterviews = await db.StatusHistories
            .Where(h => h.InterviewAt != null && h.InterviewAt >= now)
            .Where(h => ownerUserId == null || h.Candidate.OwnerUserId == ownerUserId)
            .OrderBy(h => h.InterviewAt)
            .Take(10)
            .Select(h => new UpcomingInterviewDto(
                h.CandidateId,
                h.Candidate.FullName,
                h.Candidate.RoleAppliedOption != null
                    ? h.Candidate.RoleAppliedOption.Name
                    : h.Candidate.AppliedRole,
                h.Candidate.CurrentStatus,
                h.InterviewAt!.Value))
            .ToListAsync();

        // ---- Recent activity (latest status changes) ----
        var recentActivity = await db.StatusHistories
            .Where(h => ownerUserId == null || h.Candidate.OwnerUserId == ownerUserId)
            .OrderByDescending(h => h.ChangedAt)
            .Take(10)
            .Select(h => new ActivityItemDto(
                h.CandidateId, h.Candidate.FullName, h.Status, h.ChangedBy, h.ChangedAt))
            .ToListAsync();

        // ---- Active job openings (active roles) + applicant counts derived by role ----
        var applicantsByRole = await candidates
            .Where(c => c.RoleAppliedOptionId != null)
            .GroupBy(c => c.RoleAppliedOptionId!.Value)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count);

        var activeRoles = await db.RoleAppliedOptions
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new
            {
                r.Id, r.Name, r.Location, r.Department, r.Priority, r.PostedDate, r.CreatedAt,
            })
            .ToListAsync();

        var activeJobOpenings = activeRoles
            .Select(r => new JobOpeningDto(
                r.Id, r.Name, r.Location, r.Department, r.Priority,
                r.PostedDate ?? r.CreatedAt,
                applicantsByRole.TryGetValue(r.Id, out var n) ? n : 0))
            .ToList();

        return new DashboardDto(
            kpis, statusBreakdown, byRole, topSkills, trend, upcomingInterviews, recentActivity,
            activeJobOpenings);
    }
}
