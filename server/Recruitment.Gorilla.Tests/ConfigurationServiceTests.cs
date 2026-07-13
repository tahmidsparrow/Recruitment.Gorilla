using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>ConfigurationService — recruiter assignment (many-to-many), scoped role lookup, and delete rules.</summary>
public class ConfigurationServiceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private static UpsertRoleAppliedOptionDto RoleDto(string name, params int[] recruiterUserIds) =>
        new(name, 100, true, DateTime.UtcNow.AddDays(30), RecruiterUserIds: recruiterUserIds.ToList());

    [Fact]
    public async Task CreateRole_persists_recruiter_assignments()
    {
        var r1 = Data.AddUser(Roles.Recruiter);
        var r2 = Data.AddUser(Roles.Recruiter);

        var (created, conflict, error) = await Config().CreateRoleAsync(RoleDto($"R-{Guid.NewGuid():N}", r1.Id, r2.Id));

        Assert.Null(error);
        Assert.False(conflict);
        Assert.NotNull(created);
        Assert.Equal(new[] { r1.Id, r2.Id }.OrderBy(x => x), created!.Recruiters.Select(x => x.UserId).OrderBy(x => x));
    }

    [Fact]
    public async Task CreateRole_rejects_an_inactive_or_unknown_recruiter()
    {
        var inactive = Data.AddUser(Roles.Recruiter, active: false);

        var (_, _, unknownErr) = await Config().CreateRoleAsync(RoleDto($"R-{Guid.NewGuid():N}", 999999));
        Assert.Contains("not valid active users", unknownErr);

        var (_, _, inactiveErr) = await Config().CreateRoleAsync(RoleDto($"R-{Guid.NewGuid():N}", inactive.Id));
        Assert.Contains("not valid active users", inactiveErr);
    }

    [Fact]
    public async Task UpdateRole_replaces_the_recruiter_set()
    {
        var r1 = Data.AddUser(Roles.Recruiter);
        var r2 = Data.AddUser(Roles.Recruiter);
        var (created, _, _) = await Config().CreateRoleAsync(RoleDto($"R-{Guid.NewGuid():N}", r1.Id));

        var (updated, notFound, conflict, error) = await Config().UpdateRoleAsync(
            created!.Id, RoleDto(created.Name, r2.Id));

        Assert.Null(error);
        Assert.False(notFound);
        Assert.False(conflict);
        Assert.Equal([r2.Id], updated!.Recruiters.Select(x => x.UserId));
    }

    [Fact]
    public async Task GetAssignedRoles_returns_only_the_users_roles()
    {
        var r1 = Data.AddUser(Roles.Recruiter);
        var r2 = Data.AddUser(Roles.Recruiter);
        var roleA = Data.AddRole(recruiterUserIds: r1.Id);
        var roleB = Data.AddRole(recruiterUserIds: r2.Id);

        var assigned = await Config().GetAssignedRolesAsync(r1.Id);
        var ids = assigned.Select(r => r.Id).ToHashSet();

        Assert.Contains(roleA.Id, ids);
        Assert.DoesNotContain(roleB.Id, ids);
    }

    [Fact]
    public async Task DeleteRole_softdisables_when_it_has_candidates_else_hard_deletes()
    {
        // In use → soft-disable.
        var usedRole = Data.AddRole();
        Data.AddCandidate(roleId: usedRole.Id);
        var (found, deleted, deactivated, count) = await Config().DeleteRoleAsync(usedRole.Id);
        Assert.True(found);
        Assert.False(deleted);
        Assert.True(deactivated);
        Assert.Equal(1, count);
        Assert.False((await Db.RoleAppliedOptions.FindAsync(usedRole.Id))!.IsActive);

        // Not in use → hard delete.
        var freeRole = Data.AddRole();
        var free = await Config().DeleteRoleAsync(freeRole.Id);
        Assert.True(free.Deleted);
        Assert.Null(await Db.RoleAppliedOptions.FindAsync(freeRole.Id));
    }

    [Fact]
    public async Task DeleteSkill_hard_deletes_when_unused_and_softdisables_when_referenced()
    {
        var (unused, _) = await Config().CreateSkillAsync(new UpsertSkillOptionDto($"S-{Guid.NewGuid():N}", 1, true));
        Assert.True(await Config().DeleteSkillAsync(unused!.Id));
        Assert.Null(await Db.SkillOptions.FindAsync(unused.Id));

        var (used, _) = await Config().CreateSkillAsync(new UpsertSkillOptionDto($"S-{Guid.NewGuid():N}", 2, true));
        var candidate = Data.AddCandidate();
        Db.CandidateSkills.Add(new CandidateSkill { CandidateId = candidate.Id, SkillOptionId = used!.Id });
        await Db.SaveChangesAsync();

        Assert.True(await Config().DeleteSkillAsync(used.Id));
        var still = await Db.SkillOptions.FindAsync(used.Id);
        Assert.NotNull(still);
        Assert.False(still!.IsActive);
    }

    [Fact]
    public async Task DeleteInterviewType_hard_deletes_when_unused()
    {
        var (type, _) = await Config().CreateInterviewTypeAsync(new UpsertInterviewTypeOptionDto($"T-{Guid.NewGuid():N}", 1, true));
        Assert.True(await Config().DeleteInterviewTypeAsync(type!.Id));
        Assert.Null(await Db.InterviewTypeOptions.FindAsync(type.Id));
    }
}
