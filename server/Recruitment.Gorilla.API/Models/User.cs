namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// An application user. Identity lives in the database (not config); a user signs in
/// with their <see cref="Email"/> and holds one or more <see cref="Roles"/>.
/// </summary>
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>PBKDF2-SHA256 hash in "iterations.saltB64.hashB64" format.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>When true the user must set a new password before doing anything else.</summary>
    public bool MustChangePassword { get; set; }

    /// <summary>Deactivated users cannot sign in or refresh; the row is retained for history.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>The Gorilla.IAM subject id this local account is linked to — null until an
    /// IAM-issued token first resolves to this row (see SubjectResolutionHandler's JIT-link).
    /// This row's local <see cref="Id"/> stays the intra-service identifier everywhere else
    /// in RG (spec section 3.3): nothing is repointed to this GUID.</summary>
    public Guid? IamSubject { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>The user (Super Admin) who created this account; null for the seeded admin.</summary>
    public int? CreatedByUserId { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserRole> Roles { get; set; } = [];
}
