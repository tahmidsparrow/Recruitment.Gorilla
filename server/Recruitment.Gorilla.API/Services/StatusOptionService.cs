using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;

namespace Recruitment.Gorilla.API.Services;

public class StatusOptionService(AppDbContext db)
{
    public async Task<List<StatusOptionDto>> GetActiveAsync() =>
        await db.StatusOptions
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new StatusOptionDto(s.Id, s.Name, s.SortOrder, s.IsInitial))
            .ToListAsync();

    public async Task<List<StatusOptionDto>> GetInitialAsync() =>
        await db.StatusOptions
            .Where(s => s.IsActive && s.IsInitial)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new StatusOptionDto(s.Id, s.Name, s.SortOrder, s.IsInitial))
            .ToListAsync();

    public async Task<List<StatusOptionDto>?> GetNextForCandidateAsync(int candidateId)
    {
        var currentStatus = await db.Candidates
            .Where(c => c.Id == candidateId)
            .Select(c => c.CurrentStatus)
            .FirstOrDefaultAsync();

        if (currentStatus is null) return null;

        return await db.StatusTransitions
            .Where(t =>
                t.IsActive &&
                t.FromStatusOption.IsActive &&
                t.ToStatusOption.IsActive &&
                t.FromStatusOption.Name == currentStatus)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.ToStatusOption.SortOrder)
            .Select(t => new StatusOptionDto(
                t.ToStatusOption.Id,
                t.ToStatusOption.Name,
                t.ToStatusOption.SortOrder,
                t.ToStatusOption.IsInitial))
            .ToListAsync();
    }
}
