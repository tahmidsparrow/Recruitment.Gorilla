namespace Recruitment.Gorilla.API.DTOs;

/// <summary>SMTP settings for the admin control panel — never carries the password.</summary>
public record EmailSettingsDto(
    string Host,
    int Port,
    string? User,
    string FromAddress,
    string FromName,
    bool UseStartTls,
    bool Enabled,
    bool PasswordSet,          // true when a password is stored (so the UI can show "leave blank to keep")
    DateTime? UpdatedAt
);

/// <summary>
/// Save payload. <see cref="Password"/> is write-only: a non-blank value replaces the stored
/// password; blank/null keeps the existing one.
/// </summary>
public record UpsertEmailSettingsDto(
    string Host,
    int Port,
    string? User,
    string? Password,
    string FromAddress,
    string FromName,
    bool UseStartTls,
    bool Enabled
);

public record TestEmailRequestDto(string ToEmail);

public record TestEmailResultDto(bool Ok, string? Error);
