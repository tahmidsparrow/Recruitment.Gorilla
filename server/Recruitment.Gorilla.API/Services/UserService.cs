using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

public class UserService(AppDbContext db, EmailService emailService)
{
    public async Task<List<UserListDto>> GetAllAsync() =>
        await db.Users
            .Include(u => u.Roles)
            .OrderBy(u => u.Name)
            .Select(u => new UserListDto(
                u.Id, u.Name, u.Email,
                u.Roles.Select(r => r.Role).ToArray(),
                u.IsActive, u.MustChangePassword, u.CreatedAt, u.LastLoginAt))
            .ToListAsync();

    /// <summary>Result of a mutating operation: an error message, or null on success.</summary>
    public record MutationResult(UserListDto? User, string? Error)
    {
        public static MutationResult Ok(UserListDto user) => new(user, null);
        public static MutationResult Fail(string error) => new(null, error);
    }

    /// <summary>
    /// Creates a local user, including initial role assignments — deliberately unlike
    /// <see cref="UpdateAsync"/>, which ignores them. The projection has to start
    /// somewhere, and the local-login fallback needs a brand-new user to hold roles
    /// before they have ever signed in through IAM. IAM still wins: the first IAM login
    /// overwrites these with its own grants (SubjectResolutionMiddleware's JIT sync).
    /// Once local login is retired, this can stop taking roles entirely.
    /// </summary>
    public async Task<MutationResult> CreateAsync(CreateUserDto dto, int createdByUserId)
    {
        var error = ValidateRoles(dto.Roles)
            ?? ValidateEmail(dto.Email)
            ?? (string.IsNullOrWhiteSpace(dto.Name) ? "Name is required." : null)
            ?? (string.IsNullOrWhiteSpace(dto.TemporaryPassword) ? "A temporary password is required." : null);
        if (error is not null) return MutationResult.Fail(error);

        var email = dto.Email.Trim();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return MutationResult.Fail("A user with that email already exists.");

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.Hash(dto.TemporaryPassword),
            MustChangePassword = true,
            IsActive = true,
            CreatedByUserId = createdByUserId,
            Roles = DistinctRoles(dto.Roles).Select(r => new UserRole { Role = r }).ToList(),
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var (subject, html) = EmailTemplates.AccountCreated(user.Name);
        await emailService.SendAsync(user.Email, user.Name, subject, html);

        return MutationResult.Ok(ToDto(user));
    }

    /// <summary>
    /// Updates name and active status. <b>Role assignments are deliberately ignored</b>,
    /// even though the DTO still carries them.
    ///
    /// Gorilla.IAM owns role assignment now: an IAM-authenticated request is authorized
    /// from its token's ats_roles claim, built from IAM's role_grants, so writing roles
    /// here would change nothing for anyone signing in through IAM while appearing to
    /// work — and would silently diverge from IAM for anyone still using the local login
    /// fallback. One writer instead: grants are made in IAM's console, and
    /// SubjectResolutionMiddleware's JIT sync mirrors them into this projection on each
    /// IAM login. (CreateAsync still seeds initial roles — see its own note.)
    /// </summary>
    public async Task<MutationResult> UpdateAsync(int id, UpdateUserDto dto)
    {
        var error = string.IsNullOrWhiteSpace(dto.Name) ? "Name is required." : null;
        if (error is not null) return MutationResult.Fail(error);

        var user = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return MutationResult.Fail("User not found.");

        // Only the deactivation half of this guard is still reachable — roles can no
        // longer be removed here — but deactivating the last active Super Admin would
        // still lock the local-login fallback out of its own admin surface.
        var isActiveSuperAdmin = user.IsActive && user.Roles.Any(r => r.Role == Roles.SuperAdmin);
        if (isActiveSuperAdmin && !dto.IsActive && await IsLastActiveSuperAdminAsync(id))
            return MutationResult.Fail("Cannot deactivate the last active Super Admin.");

        user.Name = dto.Name.Trim();
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MutationResult.Ok(ToDto(user));
    }

    public async Task<MutationResult> ResetPasswordAsync(int id, string temporaryPassword)
    {
        if (string.IsNullOrWhiteSpace(temporaryPassword))
            return MutationResult.Fail("A temporary password is required.");

        var user = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return MutationResult.Fail("User not found.");

        user.PasswordHash = PasswordHasher.Hash(temporaryPassword);
        user.MustChangePassword = true;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var (subject, html) = EmailTemplates.PasswordReset(user.Name);
        await emailService.SendAsync(user.Email, user.Name, subject, html);

        return MutationResult.Ok(ToDto(user));
    }

    private async Task<bool> IsLastActiveSuperAdminAsync(int excludingUserId) =>
        !await db.Users.AnyAsync(u =>
            u.Id != excludingUserId &&
            u.IsActive &&
            u.Roles.Any(r => r.Role == Roles.SuperAdmin));

    private static string? ValidateRoles(string[] roles)
    {
        var distinct = DistinctRoles(roles);
        if (distinct.Count == 0) return "At least one role is required.";
        if (distinct.Any(r => !Roles.All.Contains(r))) return "One or more roles are invalid.";
        return null;
    }

    private static string? ValidateEmail(string email) =>
        string.IsNullOrWhiteSpace(email) || !email.Contains('@')
            ? "A valid email address is required."
            : null;

    private static List<string> DistinctRoles(string[] roles) =>
        (roles ?? []).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();

    private static UserListDto ToDto(User u) => new(
        u.Id, u.Name, u.Email,
        u.Roles.Select(r => r.Role).ToArray(),
        u.IsActive, u.MustChangePassword, u.CreatedAt, u.LastLoginAt);
}
