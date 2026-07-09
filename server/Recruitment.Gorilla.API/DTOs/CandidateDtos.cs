namespace Recruitment.Gorilla.API.DTOs;

public record CVDraftDto(
    string? FullName,
    string? Email,
    string? Phone,
    string? CurrentTitle,
    string? Skills,
    string? Summary,
    string? LinkedInUrl,
    string? GithubUrl,
    string OriginalFileName,
    string StoredFileName,
    string FileType,
    long FileSizeBytes
);

public record CreateCandidateDto(
    string FullName,
    string Email,
    string? Phone,
    string? CurrentTitle,
    string? Skills,
    string? Summary,
    string? LinkedInUrl,
    string? GithubUrl,
    string? PortfolioUrl,
    string? AppliedRole,
    bool IsReferred,
    string? ReferenceName,
    string? ReferenceEmail,
    string? ReferenceEmployeeId,
    int? RoleAppliedOptionId,
    List<int>? SkillOptionIds,
    string StoredFileName,
    string OriginalFileName,
    string FileType,
    long FileSizeBytes,
    string InitialStatus,
    string? InitialStatusComment,
    // Deprecated: the server now derives the actor from the authenticated user.
    // Kept nullable for back-compat so omitting it doesn't fail model validation.
    string? ChangedBy = null,
    bool AllowDuplicate = false
);

public record DuplicateCandidateDto(
    string Message,
    CandidateListItemDto Existing
);

public record CvFileResult(
    string PhysicalPath,
    string OriginalFileName,
    string ContentType
);

public record UpdateCandidateDto(
    string FullName,
    string Email,
    string? Phone,
    string? CurrentTitle,
    string? Skills,
    string? Summary,
    string? LinkedInUrl,
    string? GithubUrl,
    string? PortfolioUrl,
    string? AppliedRole,
    bool IsReferred,
    string? ReferenceName,
    string? ReferenceEmail,
    string? ReferenceEmployeeId,
    int? RoleAppliedOptionId,
    List<int>? SkillOptionIds
);

public record StatusChangeDto(
    string Status,
    string? Comment,
    string? TaskDetails,
    string? SubmissionUrl,
    DateTime? InterviewAt,
    // Deprecated: the server now derives the actor from the authenticated user.
    string? ChangedBy = null
);

public record CandidateListItemDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string? CurrentTitle,
    string? AppliedRole,
    string CurrentStatus,
    DateTime CreatedAt
);

public record CandidateDetailDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string? CurrentTitle,
    string? Skills,
    string? Summary,
    string? LinkedInUrl,
    string? GithubUrl,
    string? PortfolioUrl,
    string? AppliedRole,
    bool IsReferred,
    string? ReferenceName,
    string? ReferenceEmail,
    string? ReferenceEmployeeId,
    int? RoleAppliedOptionId,
    string? RoleApplied,
    List<SkillOptionDto> SkillOptions,
    string CurrentStatus,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CVFileDto> CVFiles,
    List<StatusHistoryDto> StatusHistory
);

public record CVFileDto(
    int Id,
    string OriginalFileName,
    string FileType,
    long FileSizeBytes,
    DateTime UploadedAt
);

public record StatusHistoryDto(
    int Id,
    string Status,
    string? Comment,
    string? TaskDetails,
    string? SubmissionUrl,
    DateTime? InterviewAt,
    DateTime ChangedAt,
    string ChangedBy
);

public record StatusOptionDto(
    int Id,
    string Name,
    int SortOrder,
    bool IsInitial
);

public record RoleAppliedOptionDto(
    int Id,
    string Name,
    int SortOrder,
    bool IsActive,
    string? Location = null,
    string? Department = null,
    string? Priority = null,
    DateTime? PostedDate = null);

public record UpsertRoleAppliedOptionDto(
    string Name,
    int SortOrder,
    bool IsActive,
    string? Location = null,
    string? Department = null,
    string? Priority = null,
    DateTime? PostedDate = null);

public record SkillOptionDto(int Id, string Name, int SortOrder, bool IsActive);

public record UpsertSkillOptionDto(string Name, int SortOrder, bool IsActive);

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
