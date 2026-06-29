using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

public record TokenPair(
    string AccessToken,
    DateTime AccessExpiresAt,
    string RefreshToken,
    DateTime RefreshExpiresAt,
    string Username);

public class AuthService(AppDbContext db, IConfiguration config)
{
    private string Username => config["Auth:Username"] ?? "admin";
    private int AccessTokenMinutes => config.GetValue("Jwt:AccessTokenMinutes", 15);
    private int RefreshTokenDays => config.GetValue("Jwt:RefreshTokenDays", 7);

    // ----- Credentials -----

    public bool VerifyCredentials(string username, string password)
    {
        if (!string.Equals(username, Username, StringComparison.OrdinalIgnoreCase))
            return false;

        var stored = config["Auth:PasswordHash"];
        if (string.IsNullOrWhiteSpace(stored))
            throw new InvalidOperationException("Auth:PasswordHash is not configured.");

        return VerifyPassword(password, stored);
    }

    /// <summary>Verifies a password against a "iterations.saltB64.hashB64" PBKDF2-SHA256 hash.</summary>
    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 3) return false;

        var iterations = int.Parse(parts[0]);
        var salt = Convert.FromBase64String(parts[1]);
        var expected = Convert.FromBase64String(parts[2]);

        var actual = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    // ----- Token issuance -----

    public async Task<TokenPair> CreateTokenPairAsync(string username)
    {
        var (accessToken, accessExpires) = CreateAccessToken(username);
        var (rawRefresh, refreshExpires) = await IssueRefreshTokenAsync(username);
        return new TokenPair(accessToken, accessExpires, rawRefresh, refreshExpires, username);
    }

    private (string Token, DateTime ExpiresAt) CreateAccessToken(string username)
    {
        var key = config["Jwt:Key"]!;
        var expiresAt = DateTime.UtcNow.AddMinutes(AccessTokenMinutes);
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, "Admin"),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    private async Task<(string RawToken, DateTime ExpiresAt)> IssueRefreshTokenAsync(string username)
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays);

        db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = HashToken(raw),
            Username = username,
            ExpiresAt = expiresAt,
        });
        await db.SaveChangesAsync();

        return (raw, expiresAt);
    }

    // ----- Rotation / revocation -----

    /// <summary>Validates and rotates a refresh token. Returns a new pair, or null if invalid.</summary>
    public async Task<TokenPair?> RefreshAsync(string rawRefreshToken)
    {
        var hash = HashToken(rawRefreshToken);
        var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (existing is null || !existing.IsActive)
            return null;

        var (newRaw, refreshExpires) = await RotateAsync(existing);
        var (accessToken, accessExpires) = CreateAccessToken(existing.Username);

        return new TokenPair(accessToken, accessExpires, newRaw, refreshExpires, existing.Username);
    }

    private async Task<(string RawToken, DateTime ExpiresAt)> RotateAsync(RefreshToken current)
    {
        var newRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var newHash = HashToken(newRaw);
        var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays);

        current.RevokedAt = DateTime.UtcNow;
        current.ReplacedByTokenHash = newHash;

        db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = newHash,
            Username = current.Username,
            ExpiresAt = expiresAt,
        });
        await db.SaveChangesAsync();

        return (newRaw, expiresAt);
    }

    public async Task RevokeAsync(string rawRefreshToken)
    {
        var hash = HashToken(rawRefreshToken);
        var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (existing is { RevokedAt: null })
        {
            existing.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    private static string HashToken(string raw) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
