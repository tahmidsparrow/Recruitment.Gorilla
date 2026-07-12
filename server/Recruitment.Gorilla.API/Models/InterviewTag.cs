namespace Recruitment.Gorilla.API.Models;

/// <summary>Join row tagging an interview with a configured interview type (many-to-many).</summary>
public class InterviewTag
{
    public int InterviewId { get; set; }
    public Interview Interview { get; set; } = null!;

    public int InterviewTypeOptionId { get; set; }
    public InterviewTypeOption InterviewTypeOption { get; set; } = null!;
}
