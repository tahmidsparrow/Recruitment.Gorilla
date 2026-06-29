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

    public Candidate Candidate { get; set; } = null!;
}
