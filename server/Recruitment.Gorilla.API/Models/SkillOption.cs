namespace Recruitment.Gorilla.API.Models;

/// <summary>Admin-managed lookup of skills that can be attached to candidates.</summary>
public class SkillOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CandidateSkill> CandidateSkills { get; set; } = [];
}
