namespace Recruitment.Gorilla.API.DTOs;

public record RubricCriterionDto(
    int Id,
    int EvaluationRubricId,
    string SectionName,
    string Key,
    string Label,
    string? Hint,
    double Weight,
    int SortOrder);

public record EvaluationRubricDto(
    int Id,
    string Name,
    string? Description,
    bool IsDefault,
    bool IsActive,
    int CriteriaCount,
    int AssignedRolesCount,
    List<RubricCriterionDto> Criteria,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpsertRubricCriterionDto(
    int? Id,
    string SectionName,
    string Key,
    string Label,
    string? Hint,
    double? Weight,
    int? SortOrder);

public record UpsertEvaluationRubricDto(
    string Name,
    string? Description,
    bool IsDefault,
    bool IsActive,
    List<UpsertRubricCriterionDto> Criteria);
