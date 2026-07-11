namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// The fixed option sets for a job opening's Location and Department fields.
/// Mirrored on the frontend in client/src/pages/ConfigurationPage.tsx.
/// </summary>
public static class JobOpeningOptions
{
    public static readonly IReadOnlySet<string> Locations = new HashSet<string>
    {
        "Remote", "Office", "Hybrid", "Contractual",
    };

    public static readonly IReadOnlySet<string> Departments = new HashSet<string>
    {
        "Engineering", "Admin", "HR",
    };
}
