namespace Recruitment.Gorilla.API.Models;

public class Candidate
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CurrentTitle { get; set; }
    public string? Skills { get; set; }
    public string? Summary { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GithubUrl { get; set; }
    public string? PortfolioUrl { get; set; }
    public string? AppliedRole { get; set; }
    public bool IsReferred { get; set; }
    public string? ReferenceName { get; set; }
    public string? ReferenceEmail { get; set; }
    public string? ReferenceEmployeeId { get; set; }
    public string CurrentStatus { get; set; } = "Uploaded";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CVFile> CVFiles { get; set; } = [];
    public ICollection<StatusHistory> StatusHistories { get; set; } = [];
}
