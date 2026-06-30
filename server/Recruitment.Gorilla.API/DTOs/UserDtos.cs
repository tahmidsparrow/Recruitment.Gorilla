namespace Recruitment.Gorilla.API.DTOs;

public record UserListDto(
    int Id,
    string Name,
    string Email,
    string[] Roles,
    bool IsActive,
    bool MustChangePassword,
    DateTime CreatedAt,
    DateTime? LastLoginAt);

public record CreateUserDto(
    string Name,
    string Email,
    string[] Roles,
    string TemporaryPassword);

public record UpdateUserDto(
    string Name,
    string[] Roles,
    bool IsActive);

public record ResetPasswordDto(string TemporaryPassword);
