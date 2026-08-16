namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// Admin-managed lookup of where a candidate came from (referral, job board, agency, …).
/// Configurable rather than a fixed enum so channels can be added without a deployment —
/// source effectiveness is only as useful as the vocabulary recruiters actually use.
/// </summary>
public class CandidateSourceOption
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Candidate> Candidates { get; set; } = [];
}
