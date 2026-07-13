namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// Admin-managed lookup of roles a candidate can be considered for. Also doubles as a
/// job opening: an active role is an open position, with posting metadata (location,
/// department, priority) surfaced in the dashboard's "Active Job Openings" table.
/// The <see cref="CreatedAt"/> is the (non-editable) posted date; <see cref="EndDate"/>
/// is the required closing deadline after which the role's candidates are locked from
/// edits/status changes. Applicants are derived by role.
/// </summary>
public class RoleAppliedOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // ----- Job-opening posting metadata -----
    public string? Location { get; set; }     // Remote / Office / Hybrid / Contractual
    public string? Department { get; set; }    // Engineering / Admin / HR
    public string? Priority { get; set; }      // High / Medium / Low
    /// <summary>Required closing deadline; after this, the role's candidates are locked.</summary>
    public DateTime EndDate { get; set; }

    /// <summary>Recruiters assigned to this opening (any active users). Each can access every
    /// candidate under this role. Many-to-many via <see cref="RoleRecruiter"/>.</summary>
    public ICollection<RoleRecruiter> Recruiters { get; set; } = [];

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;  // = the posted date
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
