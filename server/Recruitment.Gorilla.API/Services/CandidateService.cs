using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

public class CandidateService(AppDbContext db)
{
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

    public async Task<CandidateDetailDto> CreateAsync(CreateCandidateDto dto)
    {
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
            ChangedBy = dto.ChangedBy,
        });

        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();

        return MapToDetail(candidate);
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
            ChangedBy = dto.ChangedBy,
        };

        db.StatusHistories.Add(entry);
        candidate.CurrentStatus = dto.Status;
        candidate.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return new StatusHistoryDto(entry.Id, entry.Status, entry.Comment, entry.ChangedAt, entry.ChangedBy);
    }

    private static CandidateDetailDto MapToDetail(Candidate c) => new(
        c.Id, c.FullName, c.Email, c.Phone, c.CurrentTitle,
        c.Skills, c.Summary, c.LinkedInUrl, c.CurrentStatus,
        c.CreatedAt, c.UpdatedAt,
        c.CVFiles.Select(f => new CVFileDto(f.Id, f.OriginalFileName, f.FileType, f.FileSizeBytes, f.UploadedAt)).ToList(),
        c.StatusHistories.Select(s => new StatusHistoryDto(s.Id, s.Status, s.Comment, s.ChangedAt, s.ChangedBy)).ToList()
    );
}
