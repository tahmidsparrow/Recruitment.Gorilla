namespace Recruitment.Gorilla.API.Auth;

/// <summary>
/// The fixed set of application roles and the comma-joined policy strings used in
/// <c>[Authorize(Roles = ...)]</c> attributes. A user may hold several of these at once.
/// </summary>
public static class Roles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Recruiter = "Recruiter";
    public const string Viewer = "Viewer";

    /// <summary>All roles that exist, for validation when assigning roles to a user.</summary>
    public static readonly IReadOnlySet<string> All =
        new HashSet<string> { SuperAdmin, Admin, Recruiter, Viewer };

    /// <summary>Manage configuration (role/skill options).</summary>
    public const string AdminOrAbove = $"{SuperAdmin},{Admin}";

    /// <summary>Create/edit/delete candidates and change their status (everyone except Viewer).</summary>
    public const string CanWriteCandidate = $"{SuperAdmin},{Admin},{Recruiter}";
}
