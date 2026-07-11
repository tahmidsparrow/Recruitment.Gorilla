using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Read-only aggregations for the dashboard. Two groups:
/// <list type="bullet">
/// <item>Org-wide, role-independent figures (KPIs, status breakdown, applications trend, job
/// openings) — every authenticated user sees the same numbers.</item>
/// <item>Owner-scoped, candidate-centric lists (<see cref="GetScopedAsync"/>) — recruiters only
/// see their own candidates; pass null for no filter.</item>
/// </list>
/// </summary>
public class DashboardService(AppDbContext db)
{
    // Exact seeded status strings (including the historical typos) — see AppDbContext seed.
    private static readonly HashSet<string> PositiveTerminal = ["Recommended"];
    private static readonly HashSet<string> NegativeTerminal =
        ["Reject", "Not Recommended", "Discontinued", "Not Available"];

    // ---- Org-wide (no owner scope) ----

    /// <summary>Org-wide KPI figures. Also computes the status counts once for the buckets.</summary>
    public async Task<DashboardKpisDto> GetKpisAsync()
    {
        var counts = await StatusCountsAsync();
        var total = counts.Sum(x => x.Count);
        var recommended = counts.Where(x => PositiveTerminal.Contains(x.Status)).Sum(x => x.Count);
        var rejected = counts.Where(x => NegativeTerminal.Contains(x.Status)).Sum(x => x.Count);
        var inProcess = total - recommended - rejected;

        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var newThisWeek = await db.Candidates.CountAsync(c => c.CreatedAt >= weekAgo);
        var referredCount = await db.Candidates.CountAsync(c => c.IsReferred);
        var referredPercent = total == 0 ? 0 : Math.Round(referredCount * 100.0 / total, 1);

        return new DashboardKpisDto(
            total, inProcess, recommended, rejected, newThisWeek, referredCount, referredPercent);
    }

    /// <summary>Org-wide current-status breakdown, ordered by the status option sort order.</summary>
    public async Task<List<StatusCountDto>> GetStatusBreakdownAsync()
    {
        var counts = await StatusCountsAsync();
        var order = await db.StatusOptions.ToDictionaryAsync(s => s.Name, s => s.SortOrder);
        return counts
            .Select(x => new StatusCountDto(
                x.Status, x.Count, order.TryGetValue(x.Status, out var so) ? so : int.MaxValue))
            .OrderBy(x => x.SortOrder)
            .ToList();
    }

    /// <summary>Org-wide applications-per-day, zero-filled over the last <paramref name="days"/>.</summary>
    public async Task<List<TrendPointDto>> GetApplicationsTrendAsync(int days = 30)
    {
        days = days is 7 or 30 or 90 ? days : 30;
        var startDate = DateTime.UtcNow.Date.AddDays(-(days - 1));
        var dailyCounts = await db.Candidates
            .Where(c => c.CreatedAt >= startDate)
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        return Enumerable.Range(0, days)
            .Select(i => startDate.AddDays(i))
            .Select(d => new TrendPointDto(
                d.ToString("yyyy-MM-dd"), dailyCounts.TryGetValue(d, out var n) ? n : 0))
            .ToList();
    }

    /// <summary>Org-wide **open** job openings (active and not past their End Date) + applicant counts.</summary>
    public async Task<List<JobOpeningDto>> GetJobOpeningsAsync()
    {
        var now = DateTime.UtcNow;
        var applicantsByRole = await db.Candidates
            .Where(c => c.RoleAppliedOptionId != null)
            .GroupBy(c => c.RoleAppliedOptionId!.Value)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count);

        var openRoles = await db.RoleAppliedOptions
            .Where(r => r.IsActive && r.EndDate >= now)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.Location, r.Department, r.Priority, r.CreatedAt, r.EndDate })
            .ToListAsync();

        return openRoles
            .Select(r => new JobOpeningDto(
                r.Id, r.Name, r.Location, r.Department, r.Priority,
                r.CreatedAt,   // posted date
                r.EndDate,
                applicantsByRole.TryGetValue(r.Id, out var n) ? n : 0))
            .ToList();
    }

    // ---- Owner-scoped (candidate-centric) ----

    /// <summary>By-role / top-skills / upcoming interviews / recent activity, scoped to the caller.</summary>
    public async Task<DashboardDto> GetScopedAsync(int? ownerUserId)
    {
        var candidates = ownerUserId is int owner
            ? db.Candidates.Where(c => c.OwnerUserId == owner)
            : db.Candidates;

        // By role (configured option name, falling back to free-text AppliedRole).
        var byRole = (await candidates
                .Select(c => c.RoleAppliedOption != null ? c.RoleAppliedOption.Name : c.AppliedRole)
                .Where(r => r != null && r != "")
                .GroupBy(r => r!)
                .Select(g => new NameCountDto(g.Key, g.Count()))
                .ToListAsync())
            .OrderByDescending(x => x.Count)
            .ToList();

        // Top skills — group by the scalar FK (translatable on MySQL), resolve names from a lookup.
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

        // Upcoming interviews — from the Interviews table, still-pending only (no stale/duplicate rows).
        var now = DateTime.UtcNow;
        var upcomingInterviews = await db.Interviews
            .Where(i => i.ScheduledAt >= now && i.Candidate.CurrentStatus == "Interview Scheduled")
            .Where(i => ownerUserId == null || i.Candidate.OwnerUserId == ownerUserId)
            .OrderBy(i => i.ScheduledAt)
            .Take(10)
            .Select(i => new UpcomingInterviewDto(
                i.CandidateId,
                i.Candidate.FullName,
                i.Candidate.RoleAppliedOption != null
                    ? i.Candidate.RoleAppliedOption.Name
                    : i.Candidate.AppliedRole,
                i.Candidate.CurrentStatus,
                i.ScheduledAt))
            .ToListAsync();

        // Recent activity (latest status changes).
        var recentActivity = await db.StatusHistories
            .Where(h => ownerUserId == null || h.Candidate.OwnerUserId == ownerUserId)
            .OrderByDescending(h => h.ChangedAt)
            .Take(10)
            .Select(h => new ActivityItemDto(
                h.CandidateId, h.Candidate.FullName, h.Status, h.ChangedBy, h.ChangedAt))
            .ToListAsync();

        return new DashboardDto(byRole, topSkills, upcomingInterviews, recentActivity);
    }

    /// <summary>Org-wide current-status counts (shared by KPIs and the breakdown).</summary>
    private async Task<List<(string Status, int Count)>> StatusCountsAsync() =>
        (await db.Candidates
            .GroupBy(c => c.CurrentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync())
        .Select(x => (x.Status, x.Count))
        .ToList();
}
