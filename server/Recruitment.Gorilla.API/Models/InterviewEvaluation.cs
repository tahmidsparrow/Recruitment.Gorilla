namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// One interviewer's evaluation of one interview (unique per interviewer + interview).
/// Editable as a draft; locked once <see cref="IsSubmitted"/> is set.
/// </summary>
public class InterviewEvaluation
{
    public int Id { get; set; }

    public int InterviewId { get; set; }
    public Interview Interview { get; set; } = null!;

    public int InterviewerUserId { get; set; }
    public User InterviewerUser { get; set; } = null!;

    /// <summary>Strengths / areas for improvement / red flags (free text).</summary>
    public string? GeneralAssessment { get; set; }

    /// <summary>Recommended | Hold | Reject | Other.</summary>
    public string? Recommendation { get; set; }

    /// <summary>Free-text detail, required when <see cref="Recommendation"/> is "Other".</summary>
    public string? RecommendationOther { get; set; }

    /// <summary>Overall rating 1–5.</summary>
    public int? OverallRating { get; set; }

    public bool IsSubmitted { get; set; }
    public DateTime? SubmittedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InterviewEvaluationItem> Items { get; set; } = [];
}
