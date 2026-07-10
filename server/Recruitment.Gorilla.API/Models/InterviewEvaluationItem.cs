namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A single criterion score within an evaluation (e.g. CoreTechnicalCompetency).
/// Valid keys live in <see cref="EvaluationCriteria"/>; unique per evaluation + key.
/// </summary>
public class InterviewEvaluationItem
{
    public int Id { get; set; }

    public int InterviewEvaluationId { get; set; }
    public InterviewEvaluation InterviewEvaluation { get; set; } = null!;

    public string CriterionKey { get; set; } = string.Empty;

    /// <summary>1–5, or null when not rated ("-" on the paper form).</summary>
    public int? Rating { get; set; }

    public string? Comment { get; set; }
}
