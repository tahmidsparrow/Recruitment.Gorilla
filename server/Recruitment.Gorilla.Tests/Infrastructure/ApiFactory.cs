using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Recruitment.Gorilla.Tests.Infrastructure;

/// <summary>
/// Boots the real API (whole HTTP pipeline incl. auth) against a throwaway MySQL database.
/// The connection string + a test JWT signing key are supplied via environment variables — which
/// <c>WebApplication.CreateBuilder</c> reads at startup, before the top-level Program code runs
/// (a plain <c>ConfigureAppConfiguration</c> would be applied too late). Environment variables also
/// win over user-secrets, so the real database is never used; "Testing" skips user-secrets entirely.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory(string connectionString)
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", connectionString);
        Environment.SetEnvironmentVariable("Jwt__Key", "rg-integration-test-signing-key-32bytes-minimum!!");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "rg-test-issuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "rg-test-audience");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Testing");
}
