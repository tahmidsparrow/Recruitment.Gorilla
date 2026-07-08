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
    int Applicants
);

public record DashboardDto(
    DashboardKpisDto Kpis,
    List<StatusCountDto> StatusBreakdown,          // funnel + donut share this
    List<NameCountDto> ByRole,
    List<NameCountDto> TopSkills,                  // top 8
    List<TrendPointDto> ApplicationsTrend,         // last 30 days, zero-filled
    List<UpcomingInterviewDto> UpcomingInterviews, // next 10, future only
    List<ActivityItemDto> RecentActivity,          // latest 10 status changes
    List<JobOpeningDto> ActiveJobOpenings          // active roles as job openings
);
