using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Reads the authenticated user's identity from the current request's claims.
/// <c>sub</c> is either a local integer id (a token from RG's own login) or an
/// IAM-issued GUID subject; either way, <see cref="Authorization.SubjectResolutionMiddleware"/>
/// resolves it to a local user id before authentication finishes and stashes it as a
/// "local_user_id" claim before any controller runs — <see cref="UserId"/> just reads
/// that back, so it stays a cheap synchronous property instead of rippling an async DB
/// lookup through every one of its ~20 call sites.
/// </summary>
public class CurrentUser(IHttpContextAccessor accessor)
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    /// <summary>The token's raw <c>sub</c> claim as a GUID — set only for an IAM-issued
    /// token, null for RG's own local tokens (whose <c>sub</c> is a local integer id).</summary>
    public Guid? Subject =>
        Guid.TryParse(Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var sub) ? sub : null;

    /// <summary>The local user id if this request has a resolved identity, otherwise null.
    /// For callers that legitimately run without one (a background or anonymous path, or a
    /// service under unit test) and want unattributed behaviour rather than an exception.</summary>
    public int? UserIdOrNull =>
        int.TryParse(Principal?.FindFirst("local_user_id")?.Value, out var id) ? id : null;

    /// <summary>The local user id, resolved by <see cref="Authorization.SubjectResolutionMiddleware"/>
    /// before this request reached a controller. Throws if read outside an authenticated,
    /// resolved request — that should be unreachable, since an unresolved subject already
    /// gets a 403 from that middleware before routing/authorization even runs.</summary>
    public int UserId =>
        UserIdOrNull
        ?? throw new InvalidOperationException(
            "CurrentUser.UserId read without a resolved identity — SubjectResolutionMiddleware " +
            "should already have run and rejected the request if this were reachable.");

    public string? Name => Principal?.FindFirst(ClaimTypes.Name)?.Value;

    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value;

    /// <summary>Role claim type varies by scheme — <see cref="ClaimTypes.Role"/> for RG's
    /// own tokens, "ats_roles" for an IAM-issued one (set via each scheme's
    /// TokenValidationParameters.RoleClaimType in Program.cs) — so this reads whatever
    /// the resolved identity was actually configured with, not a hardcoded type.</summary>
    public IReadOnlyList<string> Roles =>
        Principal?.Identity is ClaimsIdentity identity
            ? identity.FindAll(identity.RoleClaimType).Select(c => c.Value).ToList()
            : [];

    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;

    public bool IsInAnyRole(params string[] roles) => roles.Any(IsInRole);
}
