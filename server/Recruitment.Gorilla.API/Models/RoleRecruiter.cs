namespace Recruitment.Gorilla.API.Models;

/// <summary>Join row assigning a user as a recruiter for a role/job opening (many-to-many).
/// An assigned recruiter can access every candidate under that role.</summary>
public class RoleRecruiter
{
    public int RoleAppliedOptionId { get; set; }
    public RoleAppliedOption RoleAppliedOption { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
