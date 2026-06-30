using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Reads the authenticated user's identity from the current request's claims.
/// Claims are produced by <see cref="AuthService"/>: <c>sub</c> = user id,
/// <see cref="ClaimTypes.Name"/> = display name, <see cref="ClaimTypes.Email"/> = email,
/// one <see cref="ClaimTypes.Role"/> claim per assigned role.
/// </summary>
public class CurrentUser(IHttpContextAccessor accessor)
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? UserId =>
        int.TryParse(Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : null;

    public string? Name => Principal?.FindFirst(ClaimTypes.Name)?.Value;

    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value;

    public IReadOnlyList<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? [];

    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;

    public bool IsInAnyRole(params string[] roles) => roles.Any(IsInRole);
}
