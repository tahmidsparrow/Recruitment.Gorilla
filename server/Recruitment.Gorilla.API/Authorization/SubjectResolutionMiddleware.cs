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

        // Defence in depth, not the primary control: IAM's own /connect/authorize
        // handler is supposed to refuse a token for a client the subject holds no
        // grant for (spec section 3.1 — role_grants is authoritative), so a
        // correctly-behaving IAM should never hand RG a token with zero ats_roles
        // at all. RG must not depend solely on that holding, though — a bug or
        // future regression on IAM's side would otherwise turn straight into an
        // RG access hole with nothing behind it. Checked before the JIT-link DB
        // work below: a token with no role for this app has no business here
        // regardless of whether a matching local user exists.
        if (principal.Identity is not ClaimsIdentity identity || !identity.FindAll(identity.RoleClaimType).Any())
            return false;

        var user = await db.Users.Include(u => u.Roles).SingleOrDefaultAsync(u => u.IamSubject == iamSubject);
        if (user is null)
        {
            var email = ReadEmail(principal);
            if (email is null)
                return false; // nothing to match or create on — fail closed

            user = await db.Users.Include(u => u.Roles).SingleOrDefaultAsync(u => u.Email == email);
            if (user is not null)
            {
                user.IamSubject = iamSubject;
                await db.SaveChangesAsync();
            }
            else
            {
                user = await ProvisionShadowUserAsync(db, iamSubject, email, ReadName(principal) ?? email);
                if (user is null)
                    return false; // couldn't establish a local row — fail closed
            }
        }

        if (!user.IsActive)
            return false; // deactivated locally — fail closed even if IAM still considers the subject active

        await SyncLocalRolesAsync(user, identity, db);

        AddResolvedClaim(principal, user.Id);
        return true;
    }

    /// <summary>
    /// The "JIT" leg of spec section 3.6's "webhook + JIT + nightly reconcile"
    /// provisioning: refresh RG's local UserRoles from the token's ats_roles on
    /// every IAM-authenticated request.
    ///
    /// This does NOT affect what the caller may do — that is enforced entirely
    /// from the token's own role claims. It keeps the local <b>projection</b>
    /// accurate, which RG still genuinely needs: ConfigurationService's
    /// GetRecruiterOptionsAsync and ValidateRecruiters both filter on UserRoles to
    /// drive the "who can be a job opening's recruiter" dropdown, and no token can
    /// answer "who are all our Recruiters?" (spec section 3.1 — keep the
    /// projections). Now that IAM owns role assignment and RG's own admin UI no
    /// longer writes roles, this is the only thing keeping that data from rotting.
    ///
    /// Writes only on an actual difference, so the steady-state cost per request
    /// is a small set comparison rather than a round trip.
    /// </summary>
    private static async Task SyncLocalRolesAsync(Models.User user, ClaimsIdentity identity, AppDbContext db)
    {
        var tokenRoles = identity.FindAll(identity.RoleClaimType).Select(c => c.Value).ToHashSet(StringComparer.Ordinal);
        var localRoles = user.Roles.Select(r => r.Role).ToHashSet(StringComparer.Ordinal);
        if (tokenRoles.SetEquals(localRoles))
            return;

        // Minimal diff rather than clear-and-re-add: only the roles that actually
        // changed are touched, so rows that are already correct aren't deleted and
        // reinserted (churning their ids) and there is less for concurrent requests
        // to collide over.
        foreach (var stale in user.Roles.Where(r => !tokenRoles.Contains(r.Role)).ToList())
            user.Roles.Remove(stale);
        foreach (var added in tokenRoles.Where(r => !localRoles.Contains(r)))
            user.Roles.Add(new Models.UserRole { Role = added });

        user.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // A concurrent request for the same user already applied this exact sync.
            // Not an error: an SPA fires a burst of API calls on page load and every
            // one of them runs this middleware, so losing the race is the normal case,
            // and the winner already produced the end state this one wanted. Found the
            // hard way — a real browser login 500'd on its first wave of requests while
            // every single-request test passed.
            //
            // Detaching everything is safe here specifically because this middleware
            // runs before routing and MVC: nothing but what was loaded above is tracked
            // yet, and dropping the failed edits keeps a later SaveChanges in this same
            // request (an audit write, say) from inheriting them.
            foreach (var entry in db.ChangeTracker.Entries().ToList())
                entry.State = EntityState.Detached;
        }
    }

    /// <summary>Placeholder for the required PasswordHash column on a user who has no
    /// local password at all. Deliberately not a hash: PasswordHasher.Verify splits on
    /// '.' and returns false for anything that isn't exactly three parts, so this can
    /// never verify against any password — a shadow user cannot be signed into through
    /// RG's own login even while that login still exists.</summary>
    private const string NoLocalPassword = "iam-only-no-local-password";

    /// <summary>
    /// Creates the local shadow row for someone who exists in Gorilla.IAM but has never
    /// existed in RG — the "JIT" in spec section 3.6's "webhook + JIT + nightly
    /// reconcile" provisioning, which RG needs because it lists other users
    /// (ConfigurationService's recruiter dropdown) and no token can answer that.
    ///
    /// Reached only after the caller has already presented a signature-valid IAM token
    /// carrying at least one ats role, so IAM has explicitly granted them this app; this
    /// just stops RG turning that grant into a 403 for want of a row. The row is a
    /// projection, not an account: no password, and roles come from the token via
    /// SyncLocalRolesAsync on this same request.
    ///
    /// Found the hard way — creating a person entirely in IAM's console produced a
    /// perfectly valid login that then 403'd on every API call.
    /// </summary>
    private static async Task<Models.User?> ProvisionShadowUserAsync(
        AppDbContext db, Guid iamSubject, string email, string name)
    {
        var user = new Models.User
        {
            Email = email,
            Name = name,
            PasswordHash = NoLocalPassword,
            IsActive = true,
            IamSubject = iamSubject,
        };
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync();
            return user;
        }
        catch (DbUpdateException)
        {
            // A concurrent request for the same new person won the race — an SPA's
            // opening burst of API calls all arrive before any of them has committed.
            // Same shape as SyncLocalRolesAsync's concurrency handling: the winner
            // already created exactly the row this request wanted, so take theirs.
            foreach (var entry in db.ChangeTracker.Entries().ToList())
                entry.State = EntityState.Detached;

            return await db.Users.Include(u => u.Roles)
                .SingleOrDefaultAsync(u => u.IamSubject == iamSubject || u.Email == email);
        }
    }

    /// <summary>Same two-shapes problem as <see cref="ReadEmail"/>: RG's own tokens use
    /// the long ClaimTypes URI, an IAM-issued one uses the plain OIDC "name".</summary>
    private static string? ReadName(ClaimsPrincipal principal) =>
        principal.FindFirst(ClaimTypes.Name)?.Value ?? principal.FindFirst("name")?.Value;

    /// <summary>RG's own tokens carry email under <see cref="ClaimTypes.Email"/> (the long URI —
    /// AuthService.CreateAccessToken's own choice, made so MapInboundClaims=false doesn't need to
    /// touch it). An IAM-issued token carries it under the plain "email" (OpenIddict's
    /// Claims.Email, standard OIDC short form) — MapInboundClaims=false on both schemes means
    /// neither gets remapped to the other's shape, so this has to check both. Confirmed the hard
    /// way: a real IAM token's JIT-link silently 403'd because this looked for only the long form.</summary>
    private static string? ReadEmail(ClaimsPrincipal principal) =>
        principal.FindFirst(ClaimTypes.Email)?.Value ?? principal.FindFirst("email")?.Value;

    private static void AddResolvedClaim(ClaimsPrincipal principal, int localUserId)
    {
        if (principal.Identity is ClaimsIdentity identity)
            identity.AddClaim(new Claim("local_user_id", localUserId.ToString()));
    }
}
