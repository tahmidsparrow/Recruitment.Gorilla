using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

public class CandidateDraftService(
    AppDbContext db,
    AuditService audit,
    CurrentUser currentUser,
    ILogger<CandidateDraftService> logger)
{
    public async Task<PagedDraftsResultDto> GetDraftsAsync(DraftsFilterQuery query)
    {
        var baseQuery = db.CandidateDrafts.AsQueryable();

        var isPrivileged = currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin);
        // Scoping: recruiters only see drafts they uploaded
        if (!isPrivileged && currentUser.UserId.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.UploadedByUserId == currentUser.UserId.Value);
        }

        // Aggregate counts across statuses
        var totalPending = await baseQuery.CountAsync(d => d.Status == "Pending");
        var totalApproved = await baseQuery.CountAsync(d => d.Status == "Approved");
        var totalDiscarded = await baseQuery.CountAsync(d => d.Status == "Discarded");

        // Filter by Status
        if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "all")
        {
            baseQuery = baseQuery.Where(d => d.Status == query.Status);
        }

        // Filter by Batch
        if (!string.IsNullOrWhiteSpace(query.BatchId))
        {
            baseQuery = baseQuery.Where(d => d.BatchId == query.BatchId);
        }

        // Filter by Role
        if (query.RoleId.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.RoleAppliedOptionId == query.RoleId.Value);
        }

        // Search text (Name, Email, Skills, Filename)
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(d =>
                (d.FullName != null && d.FullName.ToLower().Contains(search)) ||
                (d.Email != null && d.Email.ToLower().Contains(search)) ||
                (d.Skills != null && d.Skills.ToLower().Contains(search)) ||
                d.OriginalFileName.ToLower().Contains(search));
        }

        var totalCount = await baseQuery.CountAsync();

        // Apply Cursor filter for pagination (assuming ordered by Id DESC)
        if (query.Cursor.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.Id < query.Cursor.Value);
        }

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await baseQuery
            .OrderByDescending(d => d.Id) // Ensure deterministic ordering by Id for cursor pagination
            .Skip(query.Cursor.HasValue ? 0 : (page - 1) * pageSize)
            .Take(pageSize)
            .Include(d => d.RoleAppliedOption)
            .Select(d => new CandidateDraftListItemDto(
                d.Id,
                d.FullName,
                d.Email,
                d.Phone,
                d.CurrentTitle,
                d.RelevantExperience,
                d.Skills,
                d.RoleAppliedOptionId,
                d.RoleAppliedOption != null ? d.RoleAppliedOption.Name : null,
                d.OriginalFileName,
                d.StoredFileName,
                d.FileType,
                d.FileSizeBytes,
                d.Status,
                d.BatchId,
                d.BatchName,
                d.CreatedAt
            ))
            .ToListAsync();

        int? nextCursor = items.Count == pageSize ? items.Last().Id : null;

        return new PagedDraftsResultDto(
            items,
            totalCount,
            page,
            pageSize,
            totalPages,
            totalPending,
            totalApproved,
            totalDiscarded,
            nextCursor
        );
    }

    public async Task<CandidateDraftDto?> GetDraftByIdAsync(int id)
    {
        var d = await db.CandidateDrafts
            .Include(d => d.RoleAppliedOption)
            .Include(d => d.SourceOption)
            .Include(d => d.UploadedByUser)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (d == null) return null;

        return new CandidateDraftDto(
            d.Id,
            d.FullName,
            d.Email,
            d.Phone,
            d.CurrentTitle,
            d.RelevantExperience,
            d.Skills,
            d.Summary,
            d.LinkedInUrl,
            d.GithubUrl,
            d.PortfolioUrl,
            d.RoleAppliedOptionId,
            d.RoleAppliedOption?.Name,
            d.SourceOptionId,
            d.SourceOption?.Name,
            d.SourceDetail,
            d.OriginalFileName,
            d.StoredFileName,
            d.FileType,
            d.FileSizeBytes,
            d.Status,
            d.BatchId,
            d.BatchName,
            d.UploadedByUserId,
            d.UploadedByUser?.Name,
            d.CreatedAt,
            d.UpdatedAt
        );
    }

    public async Task<List<DraftBatchSummaryDto>> GetBatchesAsync()
    {
        var query = db.CandidateDrafts.AsQueryable();

        var isPrivileged = currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin);
        if (!isPrivileged && currentUser.UserId.HasValue)
        {
            query = query.Where(d => d.UploadedByUserId == currentUser.UserId.Value);
        }

        var flat = await query
            .Where(d => d.BatchId != null)
            .Select(d => new { d.BatchId, d.BatchName, d.Status, d.CreatedAt })
            .ToListAsync();

        var batches = flat
            .GroupBy(d => new { d.BatchId, d.BatchName })
            .Select(g => new DraftBatchSummaryDto(
                g.Key.BatchId!,
                g.Key.BatchName ?? g.Key.BatchId!,
                g.Count(),
                g.Count(d => d.Status == "Pending"),
                g.Count(d => d.Status == "Approved"),
                g.Count(d => d.Status == "Discarded"),
                g.Min(d => d.CreatedAt)
            ))
            .OrderByDescending(b => b.CreatedAt)
            .ToList();

        return batches;
    }

    public async Task<CandidateDraft> CreateDraftAsync(
        string originalFileName,
        string storedFileName,
        string fileType,
        long fileSizeBytes,
        string? batchId,
        string? batchName,
        string? fullName,
        string? email,
        string? phone,
        string? linkedIn,
        string? github,
        string? skills,
        string? summary)
    {
        var draft = new CandidateDraft
        {
            OriginalFileName = originalFileName,
            StoredFileName = storedFileName,
            FileType = fileType,
            FileSizeBytes = fileSizeBytes,
            BatchId = batchId,
            BatchName = batchName,
            FullName = fullName,
            Email = email,
            Phone = phone,
            LinkedInUrl = linkedIn,
            GithubUrl = github,
            Skills = skills,
            Summary = summary,
            Status = "Pending",
            UploadedByUserId = currentUser.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.CandidateDrafts.Add(draft);
        await db.SaveChangesAsync();

        logger.LogInformation(
            "Created CandidateDraft {DraftId} for file '{OriginalFileName}' in batch '{BatchId}'.",
            draft.Id, originalFileName, batchId);

        return draft;
    }

    public async Task<CandidateDraftDto?> UpdateDraftAsync(int id, UpdateCandidateDraftDto dto)
    {
        var draft = await db.CandidateDrafts.FindAsync(id);
        if (draft == null) return null;

        draft.FullName = dto.FullName?.Trim();
        draft.Email = dto.Email?.Trim();
        draft.Phone = dto.Phone?.Trim();
        draft.CurrentTitle = dto.CurrentTitle?.Trim();
        draft.RelevantExperience = dto.RelevantExperience?.Trim();
        draft.Skills = dto.Skills?.Trim();
        draft.Summary = dto.Summary?.Trim();
        draft.LinkedInUrl = dto.LinkedInUrl?.Trim();
        draft.GithubUrl = dto.GithubUrl?.Trim();
        draft.PortfolioUrl = dto.PortfolioUrl?.Trim();
        draft.RoleAppliedOptionId = dto.RoleAppliedOptionId;
        draft.SourceOptionId = dto.SourceOptionId;
        draft.SourceDetail = dto.SourceDetail?.Trim();
        draft.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return await GetDraftByIdAsync(id);
    }

    public async Task<(Candidate? Candidate, string? Error)> ApproveDraftAsync(int id, ApproveCandidateDraftDto dto)
    {
        var draft = await db.CandidateDrafts.FindAsync(id);
        if (draft == null) return (null, "Draft not found.");

        var fullName = (dto.FullName ?? draft.FullName)?.Trim();
        var email = (dto.Email ?? draft.Email)?.Trim();
        var roleId = dto.RoleAppliedOptionId ?? draft.RoleAppliedOptionId;
        var experience = (dto.RelevantExperience ?? draft.RelevantExperience)?.Trim();

        if (string.IsNullOrWhiteSpace(fullName)) return (null, "Full name is required.");
        if (string.IsNullOrWhiteSpace(email)) return (null, "Email is required.");
        if (!roleId.HasValue) return (null, "Role applied for is required.");
        if (string.IsNullOrWhiteSpace(experience)) experience = "0 Years";

        // Check if role is active and not expired
        var role = await db.RoleAppliedOptions.FindAsync(roleId.Value);
        if (role == null || !role.IsActive) return (null, "Selected role is not active.");
        if (role.EndDate < DateTime.UtcNow)
            return (null, $"Role '{role.Name}' expired on {role.EndDate:yyyy-MM-dd}.");

        var candidate = new Candidate
        {
            FullName = fullName,
            Email = email,
            Phone = (dto.Phone ?? draft.Phone)?.Trim(),
            CurrentTitle = (dto.CurrentTitle ?? draft.CurrentTitle)?.Trim(),
            RelevantExperience = experience,
            Skills = (dto.Skills ?? draft.Skills)?.Trim(),
            Summary = (dto.Summary ?? draft.Summary)?.Trim(),
            LinkedInUrl = (dto.LinkedInUrl ?? draft.LinkedInUrl)?.Trim(),
            GithubUrl = (dto.GithubUrl ?? draft.GithubUrl)?.Trim(),
            PortfolioUrl = (dto.PortfolioUrl ?? draft.PortfolioUrl)?.Trim(),
            RoleAppliedOptionId = roleId,
            SourceOptionId = dto.SourceOptionId ?? draft.SourceOptionId,
            SourceDetail = (dto.SourceDetail ?? draft.SourceDetail)?.Trim(),
            IsReferred = dto.IsReferred,
            ReferenceName = dto.ReferenceName?.Trim(),
            ReferenceEmail = dto.ReferenceEmail?.Trim(),
            ReferenceEmployeeId = dto.ReferenceEmployeeId?.Trim(),
            CurrentStatus = "Uploaded",
            OwnerUserId = currentUser.UserId ?? draft.UploadedByUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();

        // Attach CVFile
        var cvFile = new CVFile
        {
            CandidateId = candidate.Id,
            StoredFileName = draft.StoredFileName,
            OriginalFileName = draft.OriginalFileName,
            FileType = draft.FileType,
            FileSizeBytes = draft.FileSizeBytes,
            UploadedAt = DateTime.UtcNow
        };
        db.CVFiles.Add(cvFile);

        // Initial status history
        var history = new StatusHistory
        {
            CandidateId = candidate.Id,
            Status = "Uploaded",
            ChangedBy = currentUser.Name ?? "Super Admin",
            ChangedAt = DateTime.UtcNow,
            Comment = $"Imported from draft batch '{draft.BatchName ?? draft.BatchId ?? "Intake"}'"
        };
        db.StatusHistories.Add(history);

        // Link skill options if provided
        if (dto.SkillOptionIds is { Count: > 0 })
        {
            var validSkillIds = await db.SkillOptions
                .Where(s => dto.SkillOptionIds.Contains(s.Id) && s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();

            foreach (var sId in validSkillIds)
            {
                db.CandidateSkills.Add(new CandidateSkill
                {
                    CandidateId = candidate.Id,
                    SkillOptionId = sId
                });
            }
        }

        // Mark draft as approved
        draft.Status = "Approved";
        draft.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await audit.RecordAsync(
            action: "Candidate.CreatedFromDraft",
            entityType: nameof(Candidate),
            entityId: candidate.Id,
            summary: $"Created candidate {candidate.Id} ('{candidate.FullName}') from draft {draft.Id}.");

        return (candidate, null);
    }

    public async Task<List<int>> BulkApproveAsync(BulkApproveDraftsDto dto)
    {
        var approvedCandidateIds = new List<int>();

        var drafts = await db.CandidateDrafts
            .Where(d => dto.DraftIds.Contains(d.Id) && d.Status == "Pending")
            .ToListAsync();

        foreach (var draft in drafts)
        {
            var roleId = draft.RoleAppliedOptionId ?? dto.DefaultRoleAppliedOptionId;
            var experience = draft.RelevantExperience ?? dto.DefaultRelevantExperience ?? "0 Years";

            if (string.IsNullOrWhiteSpace(draft.FullName) || string.IsNullOrWhiteSpace(draft.Email) || !roleId.HasValue)
            {
                continue; // Skip drafts missing required fields
            }

            var approveDto = new ApproveCandidateDraftDto(
                draft.FullName,
                draft.Email,
                draft.Phone,
                draft.CurrentTitle,
                experience,
                draft.Skills,
                draft.Summary,
                draft.LinkedInUrl,
                draft.GithubUrl,
                draft.PortfolioUrl,
                roleId,
                draft.SourceOptionId ?? dto.DefaultSourceOptionId,
                draft.SourceDetail
            );

            var (candidate, err) = await ApproveDraftAsync(draft.Id, approveDto);
            if (candidate != null)
            {
                approvedCandidateIds.Add(candidate.Id);
            }
        }

        return approvedCandidateIds;
    }

    public async Task<bool> DiscardDraftAsync(int id)
    {
        var draft = await db.CandidateDrafts.FindAsync(id);
        if (draft == null) return false;

        draft.Status = "Discarded";
        draft.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        logger.LogInformation("Discarded CandidateDraft {DraftId}.", id);
        return true;
    }

    public async Task<int> BulkDiscardAsync(List<int> draftIds)
    {
        var drafts = await db.CandidateDrafts
            .Where(d => draftIds.Contains(d.Id) && d.Status == "Pending")
            .ToListAsync();

        foreach (var d in drafts)
        {
            d.Status = "Discarded";
            d.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return drafts.Count;
    }
}
