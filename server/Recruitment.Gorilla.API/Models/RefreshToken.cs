namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// A server-side refresh token. Only the SHA-256 hash of the opaque token is
/// stored, so a database leak cannot be used to mint access tokens. Tokens are
/// single-use: each refresh revokes the old token and issues a new one (rotation).
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
