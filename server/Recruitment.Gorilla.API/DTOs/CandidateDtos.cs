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
    string ChangedBy
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
    DateTime ChangedAt,
    string ChangedBy
);

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
