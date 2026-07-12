namespace Recruitment.Gorilla.API.Models;

/// <summary>Admin-managed lookup of interview types/rounds (e.g. Technical, HR, 1st Level)
/// that can be tagged onto a scheduled interview.</summary>
public class InterviewTypeOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InterviewTag> Tags { get; set; } = [];
}
