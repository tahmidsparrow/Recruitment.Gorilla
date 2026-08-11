namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// Single-row (Id = 1) SMTP configuration managed from the admin control panel. The password is
/// stored **encrypted** (<see cref="PasswordEncrypted"/>, protected by <c>SecretProtector</c>) —
/// never in plaintext, never returned to the client. Absence of a row (or <see cref="Enabled"/> =
/// false) means "not configured", and email falls back to the <c>Smtp</c> config section.
/// </summary>
public class EmailSetting
{
    public int Id { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    /// <summary>Base64(nonce | tag | ciphertext) of the SMTP password. Never plaintext.</summary>
    public string? PasswordEncrypted { get; set; }
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Recruitment Gorilla";
    public bool UseStartTls { get; set; } = true;
    public bool Enabled { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByUserId { get; set; }
}
