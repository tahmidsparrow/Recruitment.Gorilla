namespace Recruitment.Gorilla.API.DTOs;

public record AuditLogDto(
    int Id,
    DateTime Timestamp,
    int? ActorUserId,
    string ActorName,
    string Action,
    string? EntityType,
    int? EntityId,
    string? Summary,
    string? Details
);
