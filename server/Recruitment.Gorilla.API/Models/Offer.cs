namespace Recruitment.Gorilla.API.Models;

public class Offer
{
    public int Id { get; set; }
    public int CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;

    public string JobTitle { get; set; } = string.Empty;
    public decimal BaseSalary { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal? Bonus { get; set; }
    public string? Equity { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Lifecycle: Draft -> PendingApproval -> Approved -> Extended -> Accepted | Declined | Withdrawn
    /// </summary>
    public string Status { get; set; } = "Draft";

    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExtendedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public string? DeclineReason { get; set; }

    public ICollection<OfferApproval> Approvals { get; set; } = [];
}
