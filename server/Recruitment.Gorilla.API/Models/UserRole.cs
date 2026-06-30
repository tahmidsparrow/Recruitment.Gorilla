namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A single role assignment for a <see cref="User"/>. One row per assigned role, so a
/// user can hold multiple roles. The <c>(UserId, Role)</c> pair is unique.
/// </summary>
public class UserRole
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>One of the constants in <see cref="Auth.Roles"/>.</summary>
    public string Role { get; set; } = string.Empty;
}
