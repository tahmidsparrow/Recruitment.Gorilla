using System.Net;
using System.Text.Json;
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

    // ---- Candidate evaluation report: Recruiter+ (Interviewer 403); candidate-access-scoped ----
    // Admin+ reach any candidate (200); a Recruiter is authorized but this admin-owned, no-role
    // candidate is outside their access scope (404) — proving the scope, not an auth failure.

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.NotFound)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public async Task Get_evaluation_report(string role, HttpStatusCode expected)
    {
        var id = await fx.NewCandidateAsync(fx.AdminId);
        await AssertStatus(role, HttpMethod.Get, $"/api/candidates/{id}/evaluation-report", expected);
    }

    // ---- Configuration management: Admin+ ----

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.Forbidden)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public Task Get_config_roles(string role, HttpStatusCode expected) =>
        AssertStatus(role, HttpMethod.Get, "/api/config/roles", expected);

    // ---- Audit trail: Admin+ ----

    [Theory]
    [InlineData("SuperAdmin", HttpStatusCode.OK)]
    [InlineData("Admin", HttpStatusCode.OK)]
    [InlineData("Recruiter", HttpStatusCode.Forbidden)]
    [InlineData("Interviewer", HttpStatusCode.Forbidden)]
    public Task Get_audit(string role, HttpStatusCode expected) =>
        AssertStatus(role, HttpMethod.Get, "/api/audit", expected);

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
    [InlineData("/api/audit")]
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

    // ---- Audit recording is wired: an action produces a queryable row ----

    [Fact]
    public async Task Deleting_a_candidate_writes_an_audit_row()
    {
        var token = await TokenFor("SuperAdmin");
        var id = await fx.NewCandidateAsync(fx.AdminId);

        var del = await fx.SendAsync(HttpMethod.Delete, $"/api/candidates/{id}", token);
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var resp = await fx.SendAsync(HttpMethod.Get,
            "/api/audit?entityType=Candidate&action=Deleted&pageSize=200", token);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var found = doc.RootElement.GetProperty("items").EnumerateArray().Any(e =>
            e.GetProperty("action").GetString() == "Candidate.Deleted" &&
            e.GetProperty("entityId").ValueKind == JsonValueKind.Number &&
            e.GetProperty("entityId").GetInt32() == id);
        Assert.True(found, "expected a Candidate.Deleted audit row for the deleted candidate");
    }
}
