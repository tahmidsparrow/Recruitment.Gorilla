using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;

namespace Recruitment.Gorilla.API.Authorization;

/// <summary>
/// Resolves the request's <c>sub</c> claim to a local <see cref="Models.User"/> id and stashes it
/// as a "local_user_id" claim, for every authenticated request — as actual middleware (between
/// UseAuthentication and UseAuthorization in Program.cs), not an IAuthorizationHandler sitting on
/// DefaultPolicy/FallbackPolicy the way <see cref="PasswordChangedRequirement"/> does.
///
/// That was the first attempt here, and it silently didn't run on every endpoint: ASP.NET Core's
/// AuthorizationPolicy.CombineAsync only pulls a policy's default-policy requirements in for a
/// completely bare <c>[Authorize]</c> attribute — an <c>[Authorize(Roles = "...")]</c> attribute
/// on its own (Roles non-empty) skips that entirely, per its own source: <c>useDefaultPolicy</c>
/// flips to false the moment Policy/Roles/AuthenticationSchemes is set. Confirmed the hard way:
/// ConfigurationController's class-level <c>[Authorize(Roles = Roles.AdminOrAbove)]</c> plus
/// DeleteRole's method-level <c>[Authorize(Roles = Roles.SuperAdmin)]</c> — neither attribute
/// bare — never ran this logic when it lived on a policy, while CandidatesController (whose class
/// attribute is a bare <c>[Authorize]</c>) worked fine purely by accident of attribute shape.
/// Middleware has no dependency on endpoint metadata shape at all — it runs for every request.
///
/// This is the actual fix for the privilege-escalation landmine (spec section 3.3): before this
/// existed, an unresolvable subject made <c>CurrentUser.UserId</c> null, which the owner-scope
/// ternaries in CandidatesController/DashboardController silently read the same way as "this
/// caller is an admin — no filter." Failing here means a request whose identity can't be
/// resolved never reaches a controller at all, so that ambiguity can't arise.
/// </summary>
public static class SubjectResolutionMiddleware
{
    public static IApplicationBuilder UseSubjectResolution(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var db = context.RequestServices.GetRequiredService<AppDbContext>();
                if (!await TryResolveAsync(context.User, db))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return;
                }
            }

            await next(context);
        });

    private static async Task<bool> TryResolveAsync(ClaimsPrincipal principal, AppDbContext db)
    {
        var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        // RG's own tokens: sub already IS the local id (AuthService.CreateAccessToken) — no DB round trip.
        if (int.TryParse(sub, out var localId))
        {
            AddResolvedClaim(principal, localId);
            return true;
        }

        // An IAM-issued token: sub is a GUID subject. Resolve by IamSubject, or JIT-link by
        // email on first sight — same unnormalized exact-match lookup AuthService.VerifyCredentialsAsync
        // already uses, not a new convention.
        if (!Guid.TryParse(sub, out var iamSubject))
            return false; // neither shape — fail closed

        var user = await db.Users.SingleOrDefaultAsync(u => u.IamSubject == iamSubject);
        if (user is null)
        {
            var email = principal.FindFirst(ClaimTypes.Email)?.Value;
            user = email is null ? null : await db.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (user is null)
                return false; // no local RG account for this identity — fail closed, never "unrestricted"

            user.IamSubject = iamSubject;
            await db.SaveChangesAsync();
        }

        if (!user.IsActive)
            return false; // deactivated locally — fail closed even if IAM still considers the subject active

        AddResolvedClaim(principal, user.Id);
        return true;
    }

    private static void AddResolvedClaim(ClaimsPrincipal principal, int localUserId)
    {
        if (principal.Identity is ClaimsIdentity identity)
            identity.AddClaim(new Claim("local_user_id", localUserId.ToString()));
    }
}
