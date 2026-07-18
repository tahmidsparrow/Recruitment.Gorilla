using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>Candidate list filters (phone search, skills, referred) and whitelisted sorting.</summary>
public class CandidateServiceListTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private Task<PagedResult<CandidateListItemDto>> List(CandidateListQuery q, int? scope = null) =>
        Candidates().GetAllAsync(q with { PageSize = 500 }, scope);

    [Fact]
    public async Task Search_matches_phone_as_well_as_name_and_email()
    {
        var withPhone = Data.AddCandidate(phone: "+880-1712-999888");
        var other = Data.AddCandidate(phone: "+880-1555-000111");

        var byPhone = await List(new CandidateListQuery(Search: "1712-999"));
        Assert.Contains(withPhone.Id, byPhone.Items.Select(i => i.Id));
        Assert.DoesNotContain(other.Id, byPhone.Items.Select(i => i.Id));

        // name/email search still works
        var byName = await List(new CandidateListQuery(Search: withPhone.FullName));
        Assert.Contains(withPhone.Id, byName.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task Skill_filter_is_any_of_and_excludes_candidates_without_a_selected_skill()
    {
        var csharp = Data.AddSkill();
        var sql = Data.AddSkill();
        var python = Data.AddSkill();

        var hasCsharp = Data.AddCandidate(skillIds: [csharp.Id]);
        var hasSql = Data.AddCandidate(skillIds: [sql.Id]);
        var hasPython = Data.AddCandidate(skillIds: [python.Id]);
        var hasNone = Data.AddCandidate();

        var page = await List(new CandidateListQuery(SkillIds: [csharp.Id, sql.Id]));
        var ids = page.Items.Select(i => i.Id).ToHashSet();

        Assert.Contains(hasCsharp.Id, ids); // ANY-of
        Assert.Contains(hasSql.Id, ids);
        Assert.DoesNotContain(hasPython.Id, ids);
        Assert.DoesNotContain(hasNone.Id, ids);
    }

    [Fact]
    public async Task Skill_filter_is_intersected_with_recruiter_access_scope()
    {
        var admin = Data.AddUser(Roles.Admin);
        var recruiter = Data.AddUser(Roles.Recruiter);
        var assignedRole = Data.AddRole(recruiterUserIds: recruiter.Id);
        var otherRole = Data.AddRole();
        var skill = Data.AddSkill();

        var visible = Data.AddCandidate(ownerUserId: admin.Id, roleId: assignedRole.Id, skillIds: [skill.Id]);
        var hidden = Data.AddCandidate(ownerUserId: admin.Id, roleId: otherRole.Id, skillIds: [skill.Id]);

        var page = await List(new CandidateListQuery(SkillIds: [skill.Id]), recruiter.Id);
        var ids = page.Items.Select(i => i.Id).ToHashSet();

        Assert.Contains(visible.Id, ids);
        Assert.DoesNotContain(hidden.Id, ids); // same skill, but outside access scope
    }

    [Fact]
    public async Task ReferredOnly_returns_only_referred_candidates()
    {
        var referred = Data.AddCandidate(isReferred: true);
        var notReferred = Data.AddCandidate();

        var page = await List(new CandidateListQuery(ReferredOnly: true));
        var ids = page.Items.Select(i => i.Id).ToHashSet();

        Assert.Contains(referred.Id, ids);
        Assert.DoesNotContain(notReferred.Id, ids);
    }

    [Fact]
    public async Task Sort_by_name_asc_orders_alphabetically_and_junk_sort_falls_back()
    {
        // Distinctive prefixes so ordering is deterministic among just these rows.
        var role = Data.AddRole();
        var b = Data.AddCandidate(roleId: role.Id);
        var a = Data.AddCandidate(roleId: role.Id);
        Db.Candidates.Find(a.Id)!.FullName = "AAA Sort Test";
        Db.Candidates.Find(b.Id)!.FullName = "BBB Sort Test";
        await Db.SaveChangesAsync();

        var asc = await List(new CandidateListQuery(RoleId: role.Id, Sort: "name", Dir: "asc"));
        Assert.Equal(["AAA Sort Test", "BBB Sort Test"], asc.Items.Select(i => i.FullName).ToArray());

        var desc = await List(new CandidateListQuery(RoleId: role.Id, Sort: "name", Dir: "desc"));
        Assert.Equal(["BBB Sort Test", "AAA Sort Test"], desc.Items.Select(i => i.FullName).ToArray());

        // Unknown sort key falls back to CreatedAt desc without throwing.
        var junk = await List(new CandidateListQuery(RoleId: role.Id, Sort: "; DROP TABLE Candidates"));
        Assert.Equal(2, junk.Items.Count);
    }
}
