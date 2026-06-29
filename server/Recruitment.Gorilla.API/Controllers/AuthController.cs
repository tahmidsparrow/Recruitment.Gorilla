using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController(
    AuthService auth,
    IWebHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    private const string RefreshCookie = "rg_refresh";

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!auth.VerifyCredentials(dto.Username, dto.Password))
        {
            logger.LogWarning("Failed login attempt for user '{Username}'.", dto.Username);
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var pair = await auth.CreateTokenPairAsync(dto.Username);
        SetRefreshCookie(pair.RefreshToken, pair.RefreshExpiresAt);

        logger.LogInformation("User '{Username}' logged in.", pair.Username);
        return Ok(new AuthResultDto(pair.AccessToken, pair.Username, pair.AccessExpiresAt));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (string.IsNullOrEmpty(raw))
            return Unauthorized(new { message = "No refresh token." });

        var pair = await auth.RefreshAsync(raw);
        if (pair is null)
        {
            DeleteRefreshCookie();
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        SetRefreshCookie(pair.RefreshToken, pair.RefreshExpiresAt);
        return Ok(new AuthResultDto(pair.AccessToken, pair.Username, pair.AccessExpiresAt));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (!string.IsNullOrEmpty(raw))
            await auth.RevokeAsync(raw);

        DeleteRefreshCookie();
        return NoContent();
    }

    private void SetRefreshCookie(string token, DateTime expiresAt) =>
        Response.Cookies.Append(RefreshCookie, token, BuildCookieOptions(expiresAt));

    private void DeleteRefreshCookie() =>
        Response.Cookies.Append(RefreshCookie, "", BuildCookieOptions(DateTime.UtcNow.AddDays(-1)));

    private CookieOptions BuildCookieOptions(DateTime expiresAt) => new()
    {
        HttpOnly = true,
        // Secure requires HTTPS; disabled in Development where the dev server is http.
        Secure = !env.IsDevelopment(),
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = expiresAt,
    };
}
