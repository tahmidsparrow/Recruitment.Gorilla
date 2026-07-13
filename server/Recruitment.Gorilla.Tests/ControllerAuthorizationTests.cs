using System.Net;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Integration tests that exercise the real HTTP pipeline (JWT auth + [Authorize] attributes) —
/// the layer the direct service tests bypass. Asserts status codes per role.
/// </summary>
[Collection(ApiCollection.Name)]
public class ControllerAuthorizationTests(ApiFixture fx)
{
    private Task<string> TokenFor(string role) => fx.LoginAsync(role switch
    {
        "SuperAdmin" => fx.SuperAdminEmail,
        "Admin" => fx.AdminEmail,
        "Recruiter" => fx.RecruiterEmail,
        _ => fx.InterviewerEmail,
    });

    private async Task AssertStatus(string role, HttpMethod method, string url, HttpStatusCode expected)
    {
        var resp = await fx.SendAsync(method, url, await TokenFor(role));
        Assert.Equal(expected, resp.StatusCode);
    }

    // ---- Browse candidates: CanWriteCandidate (Interviewer excluded) ----

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.OK)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public Task Get_candidates(string role, HttpStatusCode expected) =>
        AssertStatus(role, HttpMethod.Get, "/api/candidates", expected);

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.OK)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public Task Get_role_options(string role, HttpStatusCode expected) =>
        AssertStatus(role, HttpMethod.Get, "/api/candidates/role-options", expected);

    // ---- Configuration management: Admin+ ----

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.Forbidden)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public Task Get_config_roles(string role, HttpStatusCode expected) =>
        AssertStatus(role, HttpMethod.Get, "/api/config/roles", expected);

    // ---- Shared reads: any authenticated role ----

    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("Admin")]
    [InlineData("Recruiter")]
    [InlineData("Interviewer")]
    public async Task Shared_reads_are_allowed_for_every_role(string role)
    {
        await AssertStatus(role, HttpMethod.Get, "/api/interviews/types", HttpStatusCode.OK);
        await AssertStatus(role, HttpMethod.Get, "/api/dashboard/kpis", HttpStatusCode.OK);
    }

    // ---- Default-deny: no token → 401 ----

    [Theory]
    [InlineData("/api/candidates")]
    [InlineData("/api/config/roles")]
    [InlineData("/api/interviews/types")]
    [InlineData("/api/dashboard/kpis")]
    public async Task Protected_endpoints_reject_anonymous(string url)
    {
        var resp = await fx.SendAsync(HttpMethod.Get, url, token: null);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ---- Delete candidate: Admin/SuperAdmin only ----

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.NoContent)]
    [InlineData("Admin", HttpStatusCode.NoContent)]
    [InlineData("Recruiter", HttpStatusCode.Forbidden)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public async Task Delete_candidate_is_admin_only(string role, HttpStatusCode expected)
    {
        var id = await fx.NewCandidateAsync(fx.AdminId);
        await AssertStatus(role, HttpMethod.Delete, $"/api/candidates/{id}", expected);
    }

    // ---- Delete role: SuperAdmin only (200), Admin forbidden ----

    [Fact]
    public async Task Delete_role_super_admin_succeeds()
    {
        var id = await fx.NewRoleAsync();
        await AssertStatus("SuperAdmin", HttpMethod.Delete, $"/api/config/roles/{id}", HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_role_admin_is_forbidden()
    {
        var id = await fx.NewRoleAsync();
        await AssertStatus("Admin", HttpMethod.Delete, $"/api/config/roles/{id}", HttpStatusCode.Forbidden);
    }
}
