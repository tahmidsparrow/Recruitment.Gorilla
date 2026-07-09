using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Manages the admin-configurable Role Applied and Skill lookup values.
/// Returned outcomes use a small result type so controllers can map to HTTP
/// (null name conflict, not found) without throwing.
/// </summary>
public class ConfigurationService(AppDbContext db)
{
    // ----- Role Applied options -----

    public async Task<List<RoleAppliedOptionDto>> GetActiveRolesAsync() =>
        await db.RoleAppliedOptions
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new RoleAppliedOptionDto(
                r.Id, r.Name, r.SortOrder, r.IsActive,
                r.Location, r.Department, r.Priority, r.PostedDate))
            .ToListAsync();

    public async Task<List<RoleAppliedOptionDto>> GetAllRolesAsync() =>
        await db.RoleAppliedOptions
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new RoleAppliedOptionDto(
                r.Id, r.Name, r.SortOrder, r.IsActive,
                r.Location, r.Department, r.Priority, r.PostedDate))
            .ToListAsync();

    public async Task<(RoleAppliedOptionDto? Created, bool Conflict)> CreateRoleAsync(UpsertRoleAppliedOptionDto dto)
    {
        var name = dto.Name.Trim();
        if (await db.RoleAppliedOptions.AnyAsync(r => r.Name == name))
            return (null, true);

        var entity = new RoleAppliedOption
        {
            Name = name,
            SortOrder = dto.SortOrder,
            IsActive = dto.IsActive,
            Location = Clean(dto.Location),
            Department = Clean(dto.Department),
            Priority = Clean(dto.Priority),
            PostedDate = dto.PostedDate,
        };
        db.RoleAppliedOptions.Add(entity);
        await db.SaveChangesAsync();
        return (ToDto(entity), false);
    }

    public async Task<(RoleAppliedOptionDto? Updated, bool NotFound, bool Conflict)> UpdateRoleAsync(int id, UpsertRoleAppliedOptionDto dto)
    {
        var entity = await db.RoleAppliedOptions.FindAsync(id);
        if (entity is null) return (null, true, false);

        var name = dto.Name.Trim();
        if (await db.RoleAppliedOptions.AnyAsync(r => r.Id != id && r.Name == name))
            return (null, false, true);

        entity.Name = name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        entity.Location = Clean(dto.Location);
        entity.Department = Clean(dto.Department);
        entity.Priority = Clean(dto.Priority);
        entity.PostedDate = dto.PostedDate;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return (ToDto(entity), false, false);
    }

    /// <summary>Trim to null so empty strings aren't persisted.</summary>
    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Soft-disable when referenced by a candidate; otherwise hard delete. False if not found.</summary>
    public async Task<bool> DeleteRoleAsync(int id)
    {
        var entity = await db.RoleAppliedOptions.FindAsync(id);
        if (entity is null) return false;

        var inUse = await db.Candidates.AnyAsync(c => c.RoleAppliedOptionId == id);
        if (inUse)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.RoleAppliedOptions.Remove(entity);
        }
        await db.SaveChangesAsync();
        return true;
    }

    // ----- Skill options -----

    public async Task<List<SkillOptionDto>> GetActiveSkillsAsync() =>
        await db.SkillOptions
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new SkillOptionDto(s.Id, s.Name, s.SortOrder, s.IsActive))
            .ToListAsync();

    public async Task<List<SkillOptionDto>> GetAllSkillsAsync() =>
        await db.SkillOptions
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new SkillOptionDto(s.Id, s.Name, s.SortOrder, s.IsActive))
            .ToListAsync();

    public async Task<(SkillOptionDto? Created, bool Conflict)> CreateSkillAsync(UpsertSkillOptionDto dto)
    {
        var name = dto.Name.Trim();
        if (await db.SkillOptions.AnyAsync(s => s.Name == name))
            return (null, true);

        var entity = new SkillOption { Name = name, SortOrder = dto.SortOrder, IsActive = dto.IsActive };
        db.SkillOptions.Add(entity);
        await db.SaveChangesAsync();
        return (ToDto(entity), false);
    }

    public async Task<(SkillOptionDto? Updated, bool NotFound, bool Conflict)> UpdateSkillAsync(int id, UpsertSkillOptionDto dto)
    {
        var entity = await db.SkillOptions.FindAsync(id);
        if (entity is null) return (null, true, false);

        var name = dto.Name.Trim();
        if (await db.SkillOptions.AnyAsync(s => s.Id != id && s.Name == name))
            return (null, false, true);

        entity.Name = name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return (ToDto(entity), false, false);
    }

    public async Task<bool> DeleteSkillAsync(int id)
    {
        var entity = await db.SkillOptions.FindAsync(id);
        if (entity is null) return false;

        var inUse = await db.CandidateSkills.AnyAsync(cs => cs.SkillOptionId == id);
        if (inUse)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.SkillOptions.Remove(entity);
        }
        await db.SaveChangesAsync();
        return true;
    }

    private static RoleAppliedOptionDto ToDto(RoleAppliedOption r) =>
        new(r.Id, r.Name, r.SortOrder, r.IsActive, r.Location, r.Department, r.Priority, r.PostedDate);
    private static SkillOptionDto ToDto(SkillOption s) => new(s.Id, s.Name, s.SortOrder, s.IsActive);
}
