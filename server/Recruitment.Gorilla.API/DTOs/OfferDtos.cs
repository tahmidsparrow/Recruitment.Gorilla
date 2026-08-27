namespace Recruitment.Gorilla.API.DTOs;

public record OfferDto(
    int Id,
    int CandidateId,
    string CandidateName,
    string CandidateEmail,
    string JobTitle,
    decimal BaseSalary,
    string Currency,
    decimal? Bonus,
    string? Equity,
    DateTime? StartDate,
    DateTime? ExpirationDate,
    string? Notes,
    string Status,
    int CreatedByUserId,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ExtendedAt,
    DateTime? RespondedAt,
    string? DeclineReason,
    List<OfferApprovalDto> Approvals
);

public record CreateOfferDto(
    string? JobTitle,
    decimal BaseSalary,
    string? Currency,
    decimal? Bonus,
    string? Equity,
    DateTime? StartDate,
    DateTime? ExpirationDate,
    string? Notes
);

public record UpdateOfferDto(
    string? JobTitle,
    decimal BaseSalary,
    string? Currency,
    decimal? Bonus,
    string? Equity,
    DateTime? StartDate,
    DateTime? ExpirationDate,
    string? Notes
);

public record OfferApprovalDto(
    int Id,
    int OfferId,
    int ApproverUserId,
    string ApproverName,
    string ApproverEmail,
    string Status,
    string? Comment,
    DateTime? ReviewedAt,
    DateTime CreatedAt
);

public record ReviewOfferApprovalDto(
    string Decision, // "Approved" or "Rejected"
    string? Comment
);

public record OfferDecisionDto(
    string Decision, // "Accepted" or "Declined"
    string? Reason
);

public record OfferMetricsDto(
    int TotalOffers,
    int ActiveOffers,
    int AcceptedOffers,
    int DeclinedOffers,
    int TotalHired,
    double AcceptanceRatePercentage
);
