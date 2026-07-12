namespace Recruitment.Gorilla.API.Auth;

/// <summary>
/// The fixed set of application roles and the comma-joined policy strings used in
/// <c>[Authorize(Roles = ...)]</c> attributes. A user may hold several of these at once.
/// </summary>
public static class Roles
{
    // Hierarchy: SuperAdmin → Admin → Recruiter → Interviewer. Each policy string below
    // includes every role above it, so a higher role can always do what a lower one can.
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Recruiter = "Recruiter";
    public const string Interviewer = "Interviewer";

    /// <summary>All roles that exist, for validation when assigning roles to a user.</summary>
    public static readonly IReadOnlySet<string> All =
        new HashSet<string> { SuperAdmin, Admin, Recruiter, Interviewer };

    /// <summary>Manage configuration (role/skill options).</summary>
    public const string AdminOrAbove = $"{SuperAdmin},{Admin}";

    /// <summary>Create/edit/delete candidates and change their status (everyone except Interviewer).</summary>
    public const string CanWriteCandidate = $"{SuperAdmin},{Admin},{Recruiter}";
}
