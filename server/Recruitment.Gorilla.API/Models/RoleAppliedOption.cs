namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// Admin-managed lookup of roles a candidate can be considered for. Also doubles as a
/// job opening: an active role is an open position, with optional posting metadata
/// (location, department, priority, posted date) surfaced in the dashboard's
/// "Active Job Openings" table. Applicants are derived by role.
/// </summary>
public class RoleAppliedOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // ----- Job-opening posting metadata (all optional) -----
    public string? Location { get; set; }     // e.g. Remote / Office / Hybrid
    public string? Department { get; set; }    // e.g. Engineering / Product
    public string? Priority { get; set; }      // e.g. High / Medium / Low
    public DateTime? PostedDate { get; set; }  // falls back to CreatedAt when null

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
