namespace Recruitment.Gorilla.API.DTOs;

public record CVDraftDto(
    string? FullName,
    string? Email,
    string? Phone,
    string? CurrentTitle,
    string? Skills,
    string? Summary,
    string? LinkedInUrl,
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
    string StoredFileName,
    string OriginalFileName,
    string FileType,
    long FileSizeBytes,
    string InitialStatus,
    string? InitialStatusComment,
    string ChangedBy,
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
    string? LinkedInUrl
);

public record StatusChangeDto(
    string Status,
    string? Comment,
    string? TaskDetails,
    string? SubmissionUrl,
    DateTime? InterviewAt,
    string ChangedBy
);

public record CandidateListItemDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string? CurrentTitle,
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

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
