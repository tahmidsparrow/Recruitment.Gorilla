namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A single evaluation criterion within a custom rubric scorecard.
/// Belongs to a section (e.g. "Technical Skills & Job Knowledge").
/// </summary>
public class RubricCriterion
{
    public int Id { get; set; }

    public int EvaluationRubricId { get; set; }
    public EvaluationRubric EvaluationRubric { get; set; } = null!;

    public string SectionName { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Hint { get; set; }
    public double Weight { get; set; } = 1.0;
    public int SortOrder { get; set; }
}
