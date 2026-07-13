using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;

namespace Recruitment.Gorilla.Tests.Infrastructure;

/// <summary>
/// Spins up a throwaway MySQL database on the local server for the whole test run, migrates it
/// (schema + seed data), and drops it afterwards. The base connection comes from the env var
/// <c>RG_TEST_MYSQL</c> or the API's user-secrets (<c>ConnectionStrings:DefaultConnection</c>) — only
/// the database name is swapped, so the real <c>RecruitmentGorilla</c> database is never touched.
/// </summary>
public sealed class MySqlDatabaseFixture : IAsyncLifetime
{
    private DbContextOptions<AppDbContext> _options = null!;
    public string DatabaseName { get; } = $"RG_Test_{Guid.NewGuid():N}";

    public AppDbContext NewContext() => new(_options);

    public async Task InitializeAsync()
    {
        // Detect the server version against the existing (real) database, which is reachable.
        var serverVersion = ServerVersion.AutoDetect(TestConnection.ResolveBase());

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(TestConnection.ForDatabase(DatabaseName), serverVersion)
            .Options;

        // Migrate() bootstraps the throwaway database (CREATE DATABASE) then applies the real
        // migration chain, including HasData seeds (StatusOptions, StatusTransitions, …).
        await using var ctx = NewContext();
        await ctx.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await using var ctx = NewContext();
        await ctx.Database.EnsureDeletedAsync();
    }
}

/// <summary>xUnit collection so every DB test class shares one migrated database and runs sequentially.</summary>
[CollectionDefinition(Name)]
public sealed class MySqlCollection : ICollectionFixture<MySqlDatabaseFixture>
{
    public const string Name = "mysql";
}
