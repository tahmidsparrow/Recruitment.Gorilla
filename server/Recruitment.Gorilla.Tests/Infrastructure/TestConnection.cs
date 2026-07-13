using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace Recruitment.Gorilla.Tests.Infrastructure;

/// <summary>Resolves the local MySQL connection for tests without committing a credential: the
/// <c>RG_TEST_MYSQL</c> env var, else the API's user-secrets (shared UserSecretsId). Only the
/// database name is ever swapped, so the real <c>RecruitmentGorilla</c> database is never touched.</summary>
public static class TestConnection
{
    public static string ResolveBase()
    {
        var fromEnv = Environment.GetEnvironmentVariable("RG_TEST_MYSQL");
        if (!string.IsNullOrWhiteSpace(fromEnv)) return fromEnv;

        var config = new ConfigurationBuilder()
            .AddUserSecrets(typeof(TestConnection).Assembly, optional: true)
            .AddEnvironmentVariables()
            .Build();

        var conn = config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(conn))
            throw new InvalidOperationException(
                "No test DB connection found. Set the RG_TEST_MYSQL env var, or configure the API's " +
                "user-secrets 'ConnectionStrings:DefaultConnection' (see ai-docs/dev-setup.md).");
        return conn;
    }

    /// <summary>The base connection re-pointed at a throwaway database on the same server.</summary>
    public static string ForDatabase(string databaseName) =>
        new MySqlConnectionStringBuilder(ResolveBase()) { Database = databaseName }.ConnectionString;
}
