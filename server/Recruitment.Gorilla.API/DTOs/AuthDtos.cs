namespace Recruitment.Gorilla.API.DTOs;

public record LoginDto(string Username, string Password);

/// <summary>Access token returned in the response body; the refresh token rides in an httpOnly cookie.</summary>
public record AuthResultDto(string Token, string Username, DateTime ExpiresAt);
