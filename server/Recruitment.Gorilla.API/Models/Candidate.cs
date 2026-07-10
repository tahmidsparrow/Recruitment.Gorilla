namespace Recruitment.Gorilla.API.Models;

public class Candidate
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CurrentTitle { get; set; }
    /// <summary>Free-text relevant experience, e.g. "3 Years". Required; existing rows backfilled to "0 Years".</summary>
    public string RelevantExperience { get; set; } = "0 Years";
    public string? Skills { get; set; }
    public string? Summary { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GithubUrl { get; set; }
    public string? PortfolioUrl { get; set; }
    public string? AppliedRole { get; set; }
    public int? RoleAppliedOptionId { get; set; }
    public RoleAppliedOption? RoleAppliedOption { get; set; }
    public bool IsReferred { get; set; }
    public string? ReferenceName { get; set; }
    public string? ReferenceEmail { get; set; }
    public string? ReferenceEmployeeId { get; set; }
    public string CurrentStatus { get; set; } = "Uploaded";

    /// <summary>The user who owns this candidate (the creator). Recruiters only see their own.</summary>
    public int? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CVFile> CVFiles { get; set; } = [];
    public ICollection<StatusHistory> StatusHistories { get; set; } = [];
    public ICollection<CandidateSkill> CandidateSkills { get; set; } = [];
    public ICollection<Interview> Interviews { get; set; } = [];
}
