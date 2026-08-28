namespace Recruitment.Gorilla.API.Models;

public class OfferApproval
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public Offer Offer { get; set; } = null!;

    public int ApproverUserId { get; set; }
    public User ApproverUser { get; set; } = null!;

    /// <summary>
    /// Status: Pending -> Approved | Rejected
    /// </summary>
    public string Status { get; set; } = "Pending";
    public string? Comment { get; set; }

    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
