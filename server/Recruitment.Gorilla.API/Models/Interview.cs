namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A scheduled interview for a candidate, created when the candidate moves to the
/// "Interview Scheduled" status. Carries the assigned interviewers and their evaluations.
/// </summary>
public class Interview
{
    public int Id { get; set; }

    public int CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;

    /// <summary>The "Interview Scheduled" history entry that created this interview.</summary>
    public int? StatusHistoryId { get; set; }
    public StatusHistory? StatusHistory { get; set; }

    public DateTime ScheduledAt { get; set; }

    /// <summary>The user who scheduled the interview (SetNull on user delete).</summary>
    public int? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InterviewInterviewer> Interviewers { get; set; } = [];
    public ICollection<InterviewEvaluation> Evaluations { get; set; } = [];
}
