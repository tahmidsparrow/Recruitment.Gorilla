using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>Candidate access scoping: owned OR assigned-role recruiter; Admin sees all; strict-owner delete.</summary>
public class CandidateServiceAccessTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private async Task<HashSet<int>> AccessibleIds(int? accessUserId)
    {
        var page = await Candidates().GetAllAsync(null, null, null, 1, 500, accessUserId);
        return page.Items.Select(i => i.Id).ToHashSet();
    }

    [Fact]
    public async Task Admin_scope_sees_all_candidates()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var owned = Data.AddCandidate(ownerUserId: recruiter.Id);
        var foreign = Data.AddCandidate(ownerUserId: admin.Id);

        var ids = await AccessibleIds(null); // null = Admin+

        Assert.Contains(owned.Id, ids);
        Assert.Contains(foreign.Id, ids);
    }

    [Fact]
    public async Task Recruiter_sees_owned_and_assigned_role_but_not_others()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var assignedRole = Data.AddRole(recruiterUserIds: recruiter.Id);
        var otherRole = Data.AddRole();

        var owned = Data.AddCandidate(ownerUserId: recruiter.Id);
        var underAssignedRole = Data.AddCandidate(ownerUserId: admin.Id, roleId: assignedRole.Id); // admin-created
        var underOtherRole = Data.AddCandidate(ownerUserId: admin.Id, roleId: otherRole.Id);
        var foreignNoRole = Data.AddCandidate(ownerUserId: admin.Id);

        var ids = await AccessibleIds(recruiter.Id);

        Assert.Contains(owned.Id, ids);
        Assert.Contains(underAssignedRole.Id, ids); // creator-agnostic: visible via role assignment
        Assert.DoesNotContain(underOtherRole.Id, ids);
        Assert.DoesNotContain(foreignNoRole.Id, ids);
    }

    [Fact]
    public async Task Recruiter_GetById_honors_the_same_access_predicate()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var assignedRole = Data.AddRole(recruiterUserIds: recruiter.Id);
        var otherRole = Data.AddRole();

        var visible = Data.AddCandidate(ownerUserId: admin.Id, roleId: assignedRole.Id);
        var hidden = Data.AddCandidate(ownerUserId: admin.Id, roleId: otherRole.Id);

        Assert.NotNull(await Candidates().GetByIdAsync(visible.Id, recruiter.Id));
        Assert.Null(await Candidates().GetByIdAsync(hidden.Id, recruiter.Id));
    }

    [Fact]
    public async Task Multiple_recruiters_on_one_role_each_have_access()
    {
        var admin = Data.AddUser(Roles.Admin);
        var r1 = Data.AddUser(Roles.Recruiter);
        var r2 = Data.AddUser(Roles.Recruiter);
        var role = Data.AddRole(recruiterUserIds: [r1.Id, r2.Id]);
        var candidate = Data.AddCandidate(ownerUserId: admin.Id, roleId: role.Id);

        Assert.NotNull(await Candidates().GetByIdAsync(candidate.Id, r1.Id));
        Assert.NotNull(await Candidates().GetByIdAsync(candidate.Id, r2.Id));
    }

    [Fact]
    public async Task Role_filter_returns_only_that_roles_candidates_within_access_scope()
    {
        var admin = Data.AddUser(Roles.Admin);
        var roleA = Data.AddRole();
        var roleB = Data.AddRole();
        var inA = Data.AddCandidate(ownerUserId: admin.Id, roleId: roleA.Id);
        var alsoInA = Data.AddCandidate(ownerUserId: admin.Id, roleId: roleA.Id);
        var inB = Data.AddCandidate(ownerUserId: admin.Id, roleId: roleB.Id);

        // Admin scope (null), filtered to roleA.
        var page = await Candidates().GetAllAsync(null, null, roleA.Id, 1, 500, null);
        var ids = page.Items.Select(i => i.Id).ToHashSet();

        Assert.Contains(inA.Id, ids);
        Assert.Contains(alsoInA.Id, ids);
        Assert.DoesNotContain(inB.Id, ids);
    }

    [Fact]
    public async Task Role_filter_is_intersected_with_recruiter_access_scope()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var assignedRole = Data.AddRole(recruiterUserIds: recruiter.Id);

        var visibleInRole = Data.AddCandidate(ownerUserId: admin.Id, roleId: assignedRole.Id);

        // Filtering by a role the recruiter is NOT assigned to yields nothing (access wins).
        var otherRole = Data.AddRole();
        Data.AddCandidate(ownerUserId: admin.Id, roleId: otherRole.Id);

        var assigned = await Candidates().GetAllAsync(null, null, assignedRole.Id, 1, 500, recruiter.Id);
        Assert.Contains(visibleInRole.Id, assigned.Items.Select(i => i.Id));

        var other = await Candidates().GetAllAsync(null, null, otherRole.Id, 1, 500, recruiter.Id);
        Assert.Empty(other.Items);
    }

    [Fact]
    public async Task Delete_is_strict_owner_and_ignores_role_assignment()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var role = Data.AddRole(recruiterUserIds: recruiter.Id);
        var underRoleNotOwned = Data.AddCandidate(ownerUserId: admin.Id, roleId: role.Id);

        // Role assignment grants read/edit but NOT delete: the strict-owner scope returns false.
        Assert.False(await Candidates().DeleteAsync(underRoleNotOwned.Id, recruiter.Id));
        // Admin (null scope) can delete any.
        Assert.True(await Candidates().DeleteAsync(underRoleNotOwned.Id, null));
    }
}
