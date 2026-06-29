using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

public class CandidateService(AppDbContext db, IWebHostEnvironment env)
{
    private const string Uploaded = "Uploaded";
    private const string TechnicalAssessment = "Technical Assessment";
    private const string SubmissionReceieved = "Submission Receieved";
    private const string CodeReview = "Code Review";
    private const string InterviewScheduled = "Interview Scheduled";
    private const string InterviewCompleted = "Interview Completed";
    private const string Recommended = "Recommended";
    private const string Reject = "Reject";
    private const string Discontinued = "Discontinued";

    public async Task<PagedResult<CandidateListItemDto>> GetAllAsync(
        string? search, string? status, int page, int pageSize)
    {
        var query = db.Candidates.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                c.FullName.Contains(search) ||
                c.Email.Contains(search));

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.CurrentStatus == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CandidateListItemDto(
                c.Id, c.FullName, c.Email, c.Phone,
                c.CurrentTitle, c.CurrentStatus, c.CreatedAt))
            .ToListAsync();

        return new PagedResult<CandidateListItemDto>(items, total, page, pageSize);
    }

    public async Task<CandidateDetailDto?> GetByIdAsync(int id)
    {
        var c = await db.Candidates
            .Include(x => x.CVFiles)
            .Include(x => x.StatusHistories.OrderByDescending(s => s.ChangedAt))
            .FirstOrDefaultAsync(x => x.Id == id);

        if (c is null) return null;

        return MapToDetail(c);
    }

    public async Task<CandidateListItemDto?> FindDuplicateAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;

        return await db.Candidates
            .Where(c => c.Email == email)
            .OrderBy(c => c.Id)
            .Select(c => new CandidateListItemDto(
                c.Id, c.FullName, c.Email, c.Phone,
                c.CurrentTitle, c.CurrentStatus, c.CreatedAt))
            .FirstOrDefaultAsync();
    }

    public async Task<bool> IsActiveStatusAsync(string status) =>
        await db.StatusOptions.AnyAsync(s => s.IsActive && s.Name == status);

    public async Task<string?> ValidateInitialStatusAsync(CreateCandidateDto dto)
    {
        var isAllowedInitial = await db.StatusOptions
            .AnyAsync(s => s.IsActive && s.IsInitial && s.Name == dto.InitialStatus);
        if (!isAllowedInitial)
            return "Initial status must be an active configured initial status option.";

        if (RequiresComment(dto.InitialStatus) && string.IsNullOrWhiteSpace(dto.InitialStatusComment))
            return $"{dto.InitialStatus} requires a comment.";

        return null;
    }

    public async Task<string?> ValidateStatusChangeAsync(int candidateId, StatusChangeDto dto)
    {
        var candidate = await db.Candidates
            .Include(c => c.StatusHistories)
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        if (candidate is null) return null;

        var transitionAllowed = await db.StatusTransitions.AnyAsync(t =>
            t.IsActive &&
            t.FromStatusOption.IsActive &&
            t.ToStatusOption.IsActive &&
            t.FromStatusOption.Name == candidate.CurrentStatus &&
            t.ToStatusOption.Name == dto.Status);

        if (!transitionAllowed)
            return $"Status cannot move from '{candidate.CurrentStatus}' to '{dto.Status}'.";

        if (RequiresComment(dto.Status) && string.IsNullOrWhiteSpace(dto.Comment))
            return $"{dto.Status} requires a comment.";

        if (dto.Status == TechnicalAssessment)
        {
            if (string.IsNullOrWhiteSpace(dto.Comment))
                return "Technical Assessment requires a comment.";
            if (string.IsNullOrWhiteSpace(dto.TaskDetails))
                return "Technical Assessment requires assigned task details.";
        }

        if (dto.Status == SubmissionReceieved && string.IsNullOrWhiteSpace(dto.SubmissionUrl))
            return "Submission Receieved requires a submission link.";

        if (dto.Status == CodeReview && !HasStatus(candidate, SubmissionReceieved))
            return "Code Review requires Submission Receieved to exist in the candidate history.";

        if (dto.Status == InterviewScheduled && dto.InterviewAt is null)
            return "Interview Scheduled requires interview date/time.";

        if (dto.Status == InterviewCompleted)
        {
            if (!HasStatus(candidate, InterviewScheduled))
                return "Interview Completed requires Interview Scheduled to exist in the candidate history.";
            if (string.IsNullOrWhiteSpace(dto.Comment))
                return "Interview Completed requires a comment.";
        }

        if (dto.Status == Recommended && !HasAnyStatus(candidate, [CodeReview, InterviewCompleted]))
            return "Recommended requires Code Review or Interview Completed to exist in the candidate history.";

        return null;
    }

    /// <summary>
    /// Creates a candidate. If an existing candidate shares the same email and the
    /// caller has not set AllowDuplicate, the existing record is returned in
    /// <c>Duplicate</c> and nothing is saved (warn-but-allow).
    /// </summary>
    public async Task<(CandidateDetailDto? Created, CandidateListItemDto? Duplicate)> CreateAsync(CreateCandidateDto dto)
    {
        if (!dto.AllowDuplicate)
        {
            var existing = await FindDuplicateAsync(dto.Email);
            if (existing is not null)
                return (null, existing);
        }

        var candidate = new Candidate
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            CurrentTitle = dto.CurrentTitle,
            Skills = dto.Skills,
            Summary = dto.Summary,
            LinkedInUrl = dto.LinkedInUrl,
            CurrentStatus = dto.InitialStatus,
        };

        candidate.CVFiles.Add(new CVFile
        {
            OriginalFileName = dto.OriginalFileName,
            StoredFileName = dto.StoredFileName,
            FileType = dto.FileType,
            FileSizeBytes = dto.FileSizeBytes,
        });

        candidate.StatusHistories.Add(new StatusHistory
        {
            Status = dto.InitialStatus,
            Comment = dto.InitialStatusComment,
            ChangedBy = dto.ChangedBy,
        });

        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();

        return (MapToDetail(candidate), null);
    }

    public async Task<CvFileResult?> GetCvFileAsync(int candidateId, int fileId)
    {
        var file = await db.CVFiles
            .FirstOrDefaultAsync(f => f.Id == fileId && f.CandidateId == candidateId);

        if (file is null) return null;

        var path = Path.Combine(env.ContentRootPath, "Uploads", file.StoredFileName);
        if (!File.Exists(path)) return null;

        var contentType = file.FileType == "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        return new CvFileResult(path, file.OriginalFileName, contentType);
    }

    /// <summary>
    /// Deletes a candidate and its related rows (CVFiles and StatusHistories cascade),
    /// and removes the stored CV files from disk. Returns false if not found.
    /// </summary>
    public async Task<bool> DeleteAsync(int id)
    {
        var candidate = await db.Candidates
            .Include(c => c.CVFiles)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (candidate is null) return false;

        foreach (var file in candidate.CVFiles)
        {
            var path = Path.Combine(env.ContentRootPath, "Uploads", file.StoredFileName);
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
                // Best-effort file cleanup; proceed with the DB delete regardless.
            }
        }

        db.Candidates.Remove(candidate);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<CandidateDetailDto?> UpdateAsync(int id, UpdateCandidateDto dto)
    {
        var candidate = await db.Candidates
            .Include(x => x.CVFiles)
            .Include(x => x.StatusHistories.OrderByDescending(s => s.ChangedAt))
            .FirstOrDefaultAsync(x => x.Id == id);

        if (candidate is null) return null;

        candidate.FullName = dto.FullName;
        candidate.Email = dto.Email;
        candidate.Phone = dto.Phone;
        candidate.CurrentTitle = dto.CurrentTitle;
        candidate.Skills = dto.Skills;
        candidate.Summary = dto.Summary;
        candidate.LinkedInUrl = dto.LinkedInUrl;
        candidate.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDetail(candidate);
    }

    public async Task<StatusHistoryDto?> AddStatusAsync(int id, StatusChangeDto dto)
    {
        var candidate = await db.Candidates.FindAsync(id);
        if (candidate is null) return null;

        var entry = new StatusHistory
        {
            CandidateId = id,
            Status = dto.Status,
            Comment = dto.Comment,
            TaskDetails = dto.TaskDetails,
            SubmissionUrl = dto.SubmissionUrl,
            InterviewAt = dto.InterviewAt,
            ChangedBy = dto.ChangedBy,
        };

        db.StatusHistories.Add(entry);
        candidate.CurrentStatus = dto.Status;
        candidate.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return new StatusHistoryDto(
            entry.Id,
            entry.Status,
            entry.Comment,
            entry.TaskDetails,
            entry.SubmissionUrl,
            entry.InterviewAt,
            entry.ChangedAt,
            entry.ChangedBy);
    }

    private static CandidateDetailDto MapToDetail(Candidate c) => new(
        c.Id, c.FullName, c.Email, c.Phone, c.CurrentTitle,
        c.Skills, c.Summary, c.LinkedInUrl, c.CurrentStatus,
        c.CreatedAt, c.UpdatedAt,
        c.CVFiles.Select(f => new CVFileDto(f.Id, f.OriginalFileName, f.FileType, f.FileSizeBytes, f.UploadedAt)).ToList(),
        c.StatusHistories.Select(s => new StatusHistoryDto(
            s.Id,
            s.Status,
            s.Comment,
            s.TaskDetails,
            s.SubmissionUrl,
            s.InterviewAt,
            s.ChangedAt,
            s.ChangedBy)).ToList()
    );

    private static bool RequiresComment(string status) =>
        status is Reject or Discontinued;

    private static bool HasStatus(Candidate candidate, string status) =>
        candidate.CurrentStatus == status || candidate.StatusHistories.Any(h => h.Status == status);

    private static bool HasAnyStatus(Candidate candidate, string[] statuses) =>
        statuses.Contains(candidate.CurrentStatus) ||
        candidate.StatusHistories.Any(h => statuses.Contains(h.Status));
}
