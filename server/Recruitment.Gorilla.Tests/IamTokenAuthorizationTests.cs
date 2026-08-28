using System.Net;
using System.Text.Json;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Coverage for accepting Gorilla.IAM-issued tokens (P2 increment 2) — added alongside
/// <see cref="ControllerAuthorizationTests"/> rather than folded into it, so that file stays
/// exactly what it always was: proof local login is untouched by this change.
///
/// The most important test here (<see cref="Recruiter_iam_token_is_scoped_to_own_candidates"/>)
/// is the actual regression test for the privilege-escalation landmine spec section 3.3
/// describes: before SubjectResolutionHandler existed, an unresolvable GUID subject made
/// CurrentUser.UserId null, which CandidatesController's owner-scope ternary read exactly the
/// same way as "this caller is an admin" — a Recruiter would have seen every candidate.
/// </summary>
[Collection(ApiCollection.Name)]
public class IamTokenAuthorizationTests(IamTestFixture fx)
{
    [Fact]
    public async Task Iam_token_for_a_known_email_resolves_and_authorizes_like_the_equivalent_local_token()
    {
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        var token = fx.MintIamToken(Guid.NewGuid(), recruiter.Email, recruiter.Name, Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task First_iam_request_for_a_user_persists_the_iam_subject_link()
    {
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        var subject = Guid.NewGuid();
        var token = fx.MintIamToken(subject, recruiter.Email, recruiter.Name, Roles.Recruiter);

        Assert.Null(await fx.GetIamSubjectAsync(recruiter.Id));
        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(subject, await fx.GetIamSubjectAsync(recruiter.Id));
    }

    [Fact]
    public async Task A_second_request_resolves_by_linked_subject_without_needing_the_email_to_still_match()
    {
        var subject = Guid.NewGuid();
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter, iamSubject: subject); // already linked, as if from a prior request

        // Same subject, but an email that matches no local account — if resolution still fell
        // back to an email lookup here, this would 403. It must not: IamSubject is checked first.
        var token = fx.MintIamToken(subject, "no-such-account@test.local", recruiter.Name, Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    /// <summary>Superseded by JIT provisioning: an IAM token for someone with no local
    /// row now creates that row rather than refusing. The protection that actually
    /// matters is unchanged and covered below — a token with no ats role is still
    /// refused, so this cannot become "anyone with any token gets an RG account".</summary>
    [Fact]
    public async Task Iam_token_for_an_unknown_email_provisions_a_shadow_user()
    {
        var email = $"newcomer-{Guid.NewGuid():N}@test.local";
        var token = fx.MintIamToken(Guid.NewGuid(), email, "New Comer", Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var provisioned = await fx.FindUserAsync(email);
        Assert.NotNull(provisioned);
        Assert.Equal("New Comer", provisioned!.Name);
        Assert.True(provisioned.IsActive);
        Assert.Equal([Roles.Recruiter], await fx.GetLocalRolesAsync(provisioned.Id));
    }

    /// <summary>A provisioned row is a projection, not an account: it must not be
    /// possible to sign into it through RG's own local login, which still exists.</summary>
    [Fact]
    public async Task A_provisioned_shadow_user_has_no_usable_local_password()
    {
        var email = $"newcomer-{Guid.NewGuid():N}@test.local";
        var token = fx.MintIamToken(Guid.NewGuid(), email, "New Comer", Roles.Recruiter);
        await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        var provisioned = await fx.FindUserAsync(email);

        Assert.False(PasswordHasher.Verify("", provisioned!.PasswordHash));
        Assert.False(PasswordHasher.Verify(provisioned.PasswordHash, provisioned.PasswordHash));
    }

    /// <summary>The burst of parallel API calls an SPA fires on load must not race each
    /// other into duplicate rows or a unique-index failure — the same shape of bug that
    /// a real browser login already exposed once in the role sync.</summary>
    [Fact]
    public async Task Concurrent_first_requests_provision_exactly_one_shadow_user()
    {
        var email = $"newcomer-{Guid.NewGuid():N}@test.local";
        var token = fx.MintIamToken(Guid.NewGuid(), email, "New Comer", Roles.Recruiter);

        var responses = await Task.WhenAll(Enumerable.Range(0, 8)
            .Select(_ => fx.SendAsync(HttpMethod.Get, "/api/dashboard/kpis", token)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal(1, await fx.CountUsersAsync(email));
    }

    /// <summary>Defence in depth: IAM's own /connect/authorize handler is supposed to
    /// refuse a token for a client the subject holds no grant for, so a real IAM
    /// should never hand RG a token with zero ats_roles at all — but RG must not
    /// depend solely on that holding. A token that would otherwise resolve fine
    /// (known, active, matching email) must still be rejected if it carries no
    /// ats_roles claim whatsoever.</summary>
    [Fact]
    public async Task Iam_token_with_no_ats_roles_claim_at_all_is_rejected()
    {
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        var token = fx.MintIamToken(Guid.NewGuid(), recruiter.Email, recruiter.Name); // no roles passed

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Iam_token_for_a_deactivated_local_user_is_rejected()
    {
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        await fx.DeactivateAsync(recruiter.Id);
        var token = fx.MintIamToken(Guid.NewGuid(), recruiter.Email, recruiter.Name, Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    /// <summary>The actual regression test for the landmine — see the class doc comment.</summary>
    [Fact]
    public async Task Recruiter_iam_token_is_scoped_to_own_candidates()
    {
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        var admin = await fx.SeedUserAsync(Roles.Admin);
        var owned = await fx.NewCandidateAsync(recruiter.Id);
        var foreign = await fx.NewCandidateAsync(admin.Id);
        var token = fx.MintIamToken(Guid.NewGuid(), recruiter.Email, recruiter.Name, Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var ids = doc.RootElement.GetProperty("items").EnumerateArray()
            .Select(e => e.GetProperty("id").GetInt32()).ToHashSet();

        Assert.Contains(owned, ids);
        Assert.DoesNotContain(foreign, ids);
    }

    [Fact]
    public async Task Admin_iam_token_sees_every_candidate()
    {
        var admin = await fx.SeedUserAsync(Roles.Admin);
        var recruiter = await fx.SeedUserAsync(Roles.Recruiter);
        var byAdmin = await fx.NewCandidateAsync(admin.Id);
        var byRecruiter = await fx.NewCandidateAsync(recruiter.Id);
        var token = fx.MintIamToken(Guid.NewGuid(), admin.Email, admin.Name, Roles.Admin);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var ids = doc.RootElement.GetProperty("items").EnumerateArray()
            .Select(e => e.GetProperty("id").GetInt32()).ToHashSet();

        Assert.Contains(byAdmin, ids);
        Assert.Contains(byRecruiter, ids);
    }

    // ----- JIT role sync: IAM's grants mirrored into RG's local projection -----
    //
    // These do NOT test authorization — that is enforced from the token's own claims.
    // They test that RG's local UserRoles stays accurate, which it must, because
    // ConfigurationService's GetRecruiterOptionsAsync/ValidateRecruiters filter on it
    // to drive the "who can be a job opening's recruiter" dropdown, and RG's own admin
    // UI no longer writes roles (see UserServiceRoleOwnershipTests).

    [Fact]
    public async Task A_role_added_in_IAM_appears_in_the_local_projection_on_the_next_request()
    {
        var user = await fx.SeedUserAsync(Roles.Recruiter);
        var token = fx.MintIamToken(Guid.NewGuid(), user.Email, user.Name, Roles.Recruiter, Roles.Interviewer);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal([Roles.Interviewer, Roles.Recruiter], await fx.GetLocalRolesAsync(user.Id));
    }

    [Fact]
    public async Task A_role_removed_in_IAM_disappears_from_the_local_projection()
    {
        var user = await fx.SeedUserAsync(Roles.Admin);
        var token = fx.MintIamToken(Guid.NewGuid(), user.Email, user.Name, Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal([Roles.Recruiter], await fx.GetLocalRolesAsync(user.Id)); // Admin gone, not merged
    }

    /// <summary>Local login is unaffected: an RG-issued token carries roles under
    /// ClaimTypes.Role and never reaches the IAM branch, so the projection it was
    /// built from must not be rewritten out from under it.</summary>
    [Fact]
    public async Task A_local_token_does_not_touch_the_local_projection()
    {
        var user = await fx.SeedUserAsync(Roles.Admin);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
        Assert.Equal([Roles.Admin], await fx.GetLocalRolesAsync(user.Id));
    }

    /// <summary>The regression test for a race no single-request test could catch:
    /// a real SPA fires a burst of API calls on page load, every one runs the JIT
    /// sync, and they all try to rewrite the same rows at once. Before the fix, the
    /// requests that lost that race threw DbUpdateConcurrencyException and returned
    /// 500 — found only by driving an actual browser login. Losing the race is the
    /// normal case and must be harmless.</summary>
    [Fact]
    public async Task Concurrent_requests_all_succeed_while_the_projection_is_being_synced()
    {
        var user = await fx.SeedUserAsync(Roles.Admin);
        var token = fx.MintIamToken(Guid.NewGuid(), user.Email, user.Name, Roles.Recruiter, Roles.Interviewer);

        var responses = await Task.WhenAll(Enumerable.Range(0, 8)
            .Select(_ => fx.SendAsync(HttpMethod.Get, "/api/dashboard/kpis", token)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal([Roles.Interviewer, Roles.Recruiter], await fx.GetLocalRolesAsync(user.Id));
    }
}
