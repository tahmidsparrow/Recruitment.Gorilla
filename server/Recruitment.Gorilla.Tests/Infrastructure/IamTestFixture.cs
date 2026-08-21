using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.Tests.Infrastructure;

/// <summary>
/// Boots the real API against a throwaway MySQL database, same as <see cref="ApiFixture"/>, but
/// additionally trusts a test-only RSA key for the "Iam" JWT bearer scheme (Program.cs) instead of
/// Gorilla.IAM's real Authority/JWKS discovery. This proves RG's own token-handling logic —
/// SubjectResolutionHandler, CurrentUser, the owner-scope controllers — against a token shaped
/// exactly like spec section 3.2's example, without standing up a live cross-repo IAM instance.
/// That round trip (IAM actually producing such a token) is already proven by Increment 1's
/// OidcFlowTests in Gorilla.IAM's own repo; the boundary tested here is "RG handles a
/// spec-shaped token correctly," not "IAM produces one."
/// </summary>
public sealed class IamTestFixture : IAsyncLifetime
{
    public const string Issuer = "https://iam.test/iam";
    public const string Audience = "ats";

    private IamTestFactory _factory = null!;
    private RSA _rsa = null!;
    public HttpClient Client { get; private set; } = null!;

    public string DatabaseName { get; } = $"RG_IamITest_{Guid.NewGuid():N}";

    public async Task InitializeAsync()
    {
        _rsa = RSA.Create(2048);
        _factory = new IamTestFactory(TestConnection.ForDatabase(DatabaseName), _rsa);
        Client = _factory.CreateClient(); // boots the host → Program.Migrate() creates + migrates the DB
        await Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureDeletedAsync();
        }
        Client.Dispose();
        await _factory.DisposeAsync();
        _rsa.Dispose();
    }

    /// <summary>Inserts a local RG user directly (no password needed — these tests never use local login).</summary>
    public async Task<User> SeedUserAsync(string role, string? email = null, Guid? iamSubject = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Name = $"{role}-{Guid.NewGuid():N}",
            Email = email ?? $"{role.ToLowerInvariant()}-{Guid.NewGuid():N}@test.local",
            PasswordHash = PasswordHasher.Hash("unused-in-these-tests"),
            IsActive = true,
            IamSubject = iamSubject,
            Roles = [new UserRole { Role = role }],
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<int> NewCandidateAsync(int ownerUserId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var candidate = new Candidate
        {
            FullName = $"Cand-{Guid.NewGuid():N}",
            Email = $"{Guid.NewGuid():N}@test.local",
            RelevantExperience = "3 Years",
            OwnerUserId = ownerUserId,
            CurrentStatus = "Uploaded",
        };
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync();
        return candidate.Id;
    }

    /// <summary>Re-reads a user's IamSubject from the database (to confirm JIT-linking persisted).</summary>
    public async Task<Guid?> GetIamSubjectAsync(int userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Users.FindAsync(userId))!.IamSubject;
    }

    public async Task DeactivateAsync(int userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.FindAsync(userId))!.IsActive = false;
        await db.SaveChangesAsync();
    }

    /// <summary>Mints a token shaped like spec section 3.2's example: GUID sub, namespaced
    /// "ats_roles" claim, signed with this fixture's test-only RSA key. Email/name use the
    /// plain OIDC short claim names ("email"/"name" — OpenIddict's own Claims.Email/Claims.Name,
    /// set via OidcEndpoints.cs's identity.SetClaim), not ClaimTypes.Email/ClaimTypes.Name — those
    /// long-URI forms are RG's own local tokens' convention (AuthService.CreateAccessToken), and
    /// with MapInboundClaims=false on both JWT bearer schemes (Program.cs) neither gets remapped
    /// to the other's shape. Using the wrong one here previously let this whole suite pass while
    /// masking a real bug: SubjectResolutionMiddleware's JIT-link-by-email 403'd on every real IAM
    /// token, found only by actually running the sign-in flow through a real browser.</summary>
    public string MintIamToken(Guid subject, string email, string name, params string[] atsRoles)
    {
        var creds = new SigningCredentials(new RsaSecurityKey(_rsa), SecurityAlgorithms.RsaSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject.ToString()),
            new("email", email),
            new("name", name),
        };
        claims.AddRange(atsRoles.Select(r => new Claim("ats_roles", r)));

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? token)
    {
        var req = new HttpRequestMessage(method, url);
        if (token is not null)
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return Client.SendAsync(req);
    }
}

public sealed class IamTestFactory : WebApplicationFactory<Program>
{
    private readonly RSA _rsa;

    public IamTestFactory(string connectionString, RSA rsa)
    {
        _rsa = rsa;

        // Set once, in the constructor — matching ApiFactory exactly. ConfigureWebHost can run
        // more than once per WebApplicationFactory lifecycle; setting env vars there caused
        // Program.cs's migration block to run twice against the same already-created database
        // ("database exists"), confirmed the hard way.
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", connectionString);
        Environment.SetEnvironmentVariable("Jwt__Key", "rg-integration-test-signing-key-32bytes-minimum!!");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "rg-test-issuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "rg-test-audience");
        Environment.SetEnvironmentVariable("Encryption__Key", "rg-integration-test-encryption-key-32bytes!!");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            // "Iam" must match Program.cs's IamScheme constant. Clearing Authority stops the
            // handler from attempting real JWKS discovery (nothing is listening at that
            // address in a test run) — validation falls back entirely to the manually
            // supplied issuer/audience/signing key below.
            services.PostConfigure<JwtBearerOptions>("Iam", options =>
            {
                options.Authority = null;
                options.TokenValidationParameters.ValidateIssuer = true;
                options.TokenValidationParameters.ValidIssuer = IamTestFixture.Issuer;
                options.TokenValidationParameters.ValidateAudience = true;
                options.TokenValidationParameters.ValidAudience = IamTestFixture.Audience;
                options.TokenValidationParameters.ValidateIssuerSigningKey = true;
                options.TokenValidationParameters.IssuerSigningKey = new RsaSecurityKey(_rsa);
            });
        });
    }
}
