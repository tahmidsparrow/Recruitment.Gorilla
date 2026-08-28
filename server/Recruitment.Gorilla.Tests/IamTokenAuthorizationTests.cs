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

    [Fact]
    public async Task Iam_token_for_an_unknown_email_is_rejected_not_granted_unrestricted_access()
    {
        var token = fx.MintIamToken(Guid.NewGuid(), "nobody@test.local", "Nobody", Roles.Recruiter);

        var resp = await fx.SendAsync(HttpMethod.Get, "/api/candidates", token);

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
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
}
