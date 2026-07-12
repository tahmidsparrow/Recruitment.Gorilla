namespace Recruitment.Gorilla.API.DTOs;

public record DashboardKpisDto(
    int TotalCandidates,
    int InProcess,
    int Recommended,
    int Rejected,          // negative-terminal bucket
    int NewThisWeek,       // CreatedAt >= UtcNow.AddDays(-7)
    int ReferredCount,
    double ReferredPercent // 0 when TotalCandidates == 0
);

public record StatusCountDto(string Status, int Count, int SortOrder);

public record NameCountDto(string Name, int Count);

public record TrendPointDto(string Date, int Count); // "yyyy-MM-dd" (UTC)

public record UpcomingInterviewDto(
    int CandidateId,
    string FullName,
    string? Role,
    string CurrentStatus,
    DateTime InterviewAt
);

public record ActivityItemDto(
    int CandidateId,
    string FullName,
    string Status,
    string ChangedBy,
    DateTime ChangedAt
);

public record JobOpeningDto(
    int Id,                 // rendered as JOB-00{Id}
    string Title,
    string? Location,
    string? Department,
    string? Priority,
    DateTime PostedDate,
    DateTime EndDate,       // closing deadline; past-due roles are excluded from the table
    int Applicants
);

/// <summary>
/// Owner-scoped remainder of the dashboard (candidate-centric). The org-wide KPI cards,
/// status breakdown, applications trend, and job openings are served from their own
/// all-roles endpoints (see <see cref="Controllers.DashboardController"/>).
/// </summary>
public record DashboardDto(
    List<NameCountDto> ByRole,
    List<NameCountDto> TopSkills,                  // top 8
    List<UpcomingInterviewDto> UpcomingInterviews, // next 10, pending only
    List<ActivityItemDto> RecentActivity           // latest 10 status changes
);
