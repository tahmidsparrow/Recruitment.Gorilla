namespace Recruitment.Gorilla.API.Models;

public class StatusHistory
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string? TaskDetails { get; set; }
    public string? SubmissionUrl { get; set; }
    public DateTime? InterviewAt { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string ChangedBy { get; set; } = string.Empty;

    /// <summary>
    /// Set only on an "Interview Completed" entry: the interview whose evaluations this entry
    /// summarizes and links to. Independent of <see cref="Interview.StatusHistoryId"/> (which
    /// points the other way, from an interview to its "Interview Scheduled" entry).
    /// </summary>
    public int? InterviewId { get; set; }
    public Interview? Interview { get; set; }

    public Candidate Candidate { get; set; } = null!;
}
