namespace Recruitment.Gorilla.API.Models;

/// <summary>Join row linking a candidate to a configured skill (many-to-many).</summary>
public class CandidateSkill
{
    public int CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;

    public int SkillOptionId { get; set; }
    public SkillOption SkillOption { get; set; } = null!;
}
