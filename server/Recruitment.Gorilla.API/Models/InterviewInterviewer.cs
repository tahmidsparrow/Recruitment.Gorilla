namespace Recruitment.Gorilla.API.Models;

/// <summary>Join row assigning a user as an interviewer on an interview.</summary>
public class InterviewInterviewer
{
    public int InterviewId { get; set; }
    public Interview Interview { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
