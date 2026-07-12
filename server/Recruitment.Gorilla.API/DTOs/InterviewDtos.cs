namespace Recruitment.Gorilla.API.DTOs;

public record AssignableUserDto(int Id, string Name, string Email);

public record InterviewInterviewerDto(int UserId, string Name);

/// <summary>Row in a user's personal "My interviews" list.</summary>
public record MyInterviewDto(
    int Id,
    int CandidateId,
    string CandidateName,
    string? Role,
    DateTime ScheduledAt,
    string EvaluationState // "None" | "Draft" | "Submitted"
);

public record EvaluationItemDto(string CriterionKey, int? Rating, string? Comment);

public record InterviewEvaluationDto(
    int Id,
    int InterviewerUserId,
    string InterviewerName,
    string? GeneralAssessment,
    string? Recommendation,
    string? RecommendationOther,
    int? OverallRating,
    bool IsSubmitted,
    DateTime? SubmittedAt,
    List<EvaluationItemDto> Items
);

public record InterviewDetailDto(
    int Id,
    DateTime ScheduledAt,
    CandidateDetailDto Candidate,
    List<InterviewInterviewerDto> Interviewers,
    bool CanEvaluate,                          // caller is an assigned interviewer
    InterviewEvaluationDto? MyEvaluation,      // the caller's evaluation, if any
    List<InterviewEvaluationDto>? AllEvaluations, // Admin+ only; null otherwise
    string? Notes,                             // recruiter's note = the scheduled entry's comment
    List<string> InterviewTags                 // interview type tags (Technical, HR, …)
);

public record UpsertEvaluationDto(
    string? GeneralAssessment,
    string? Recommendation,
    string? RecommendationOther,
    int? OverallRating,
    List<EvaluationItemDto>? Items,
    bool Submit
);

public record NotificationDto(
    int Id,
    string Title,
    string Message,
    string? LinkUrl,
    bool IsRead,
    DateTime CreatedAt
);

public record NotificationListDto(List<NotificationDto> Items, int UnreadCount);
