using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Pins the "IAM owns role assignment" boundary. Gorilla.IAM's role_grants is
/// authoritative — an IAM-authenticated request is authorized from its token's
/// ats_roles claim — so RG writing roles from its own admin UI would change nothing
/// for IAM logins while appearing to work, and would diverge from IAM for anyone
/// on the local-login fallback. UpdateAsync therefore ignores roles outright.
///
/// UserService had no test file at all before this; these exist because the
/// behaviour they describe is easy to "helpfully" revert later.
/// </summary>
public class UserServiceRoleOwnershipTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private UserService Users() => new(Db, TestEmail());

    private static UpdateUserDto Update(string name, string[] roles, bool isActive = true) =>
        new(name, roles, isActive);

    [Fact]
    public async Task Update_ignores_role_changes_entirely()
    {
        var user = Data.AddUser(Roles.Recruiter);

        var result = await Users().UpdateAsync(user.Id, Update("Renamed", [Roles.SuperAdmin]));

        Assert.Null(result.Error);
        Assert.Equal([Roles.Recruiter], result.User!.Roles);
    }

    [Fact]
    public async Task Update_still_applies_name_and_active_changes()
    {
        var user = Data.AddUser(Roles.Recruiter);

        var result = await Users().UpdateAsync(user.Id, Update("New Name", [Roles.Recruiter], isActive: false));

        Assert.Null(result.Error);
        Assert.Equal("New Name", result.User!.Name);
        Assert.False(result.User.IsActive);
    }

    /// <summary>Roles can no longer be stripped here, but deactivation would still
    /// lock the local-login fallback out of its own admin surface.</summary>
    [Fact]
    public async Task Deactivating_the_last_active_super_admin_is_still_refused()
    {
        var user = Data.AddUser(Roles.SuperAdmin);

        var result = await Users().UpdateAsync(user.Id, Update("Still Super", [Roles.SuperAdmin], isActive: false));

        Assert.NotNull(result.Error);
    }

    /// <summary>An empty roles array used to fail validation ("At least one role is
    /// required"). Now it's simply ignored — the caller isn't supplying roles at all.</summary>
    [Fact]
    public async Task Update_with_no_roles_supplied_succeeds_and_leaves_roles_intact()
    {
        var user = Data.AddUser(Roles.Interviewer);

        var result = await Users().UpdateAsync(user.Id, Update("Renamed", []));

        Assert.Null(result.Error);
        Assert.Equal([Roles.Interviewer], result.User!.Roles);
    }

    /// <summary>Create is deliberately asymmetric with Update: the projection has to
    /// start somewhere and the local-login fallback needs a new user to hold roles
    /// before their first IAM login.</summary>
    [Fact]
    public async Task Create_still_assigns_the_roles_it_is_given()
    {
        var result = await Users().CreateAsync(
            new CreateUserDto("New Person", $"{Guid.NewGuid():N}@test.local", [Roles.Recruiter], "Temp@12345"),
            createdByUserId: Data.AddUser(Roles.SuperAdmin).Id);

        Assert.Null(result.Error);
        Assert.Equal([Roles.Recruiter], result.User!.Roles);
    }
}
