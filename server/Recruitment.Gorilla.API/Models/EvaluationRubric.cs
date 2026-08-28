namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A customizable evaluation scorecard template. Can be designated as the system default
/// or assigned to specific job openings (RoleAppliedOption).
/// </summary>
public class EvaluationRubric
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RubricCriterion> Criteria { get; set; } = [];
    public ICollection<RoleAppliedOption> RoleAppliedOptions { get; set; } = [];
}
