using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Authorization;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.Models;
using Recruitment.Gorilla.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Write log files under the project's Logs/ folder (referenced by log4net.config as %env{RG_LOG_DIR}).
Environment.SetEnvironmentVariable(
    "RG_LOG_DIR", Path.Combine(builder.Environment.ContentRootPath, "Logs"));

builder.Logging.ClearProviders();
builder.Logging.AddLog4Net("log4net.config");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connStr))
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured. " +
        "Set it via user secrets (dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\") " +
        "or environment variables.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CandidateService>();
builder.Services.AddScoped<CVParserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<StatusOptionService>();
builder.Services.AddScoped<ConfigurationService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<InterviewService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddSingleton<IAuthorizationHandler, PasswordChangedHandler>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured. Set it via user secrets.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes (256 bits) for HS256.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256], // pin algorithm (prevents alg-confusion)
            ClockSkew = TimeSpan.Zero,
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = ClaimTypes.Role,
        };
    });

// Default-deny: every endpoint requires an authenticated user (unless [AllowAnonymous]),
// and a user with a pending forced password change is blocked from all but the
// change-password endpoint.
builder.Services.AddAuthorization(options =>
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .AddRequirements(new PasswordChangedRequirement())
        .Build());

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Apply pending migrations and seed the first Super Admin from config (once, when the
// Users table is empty). The seed reuses the existing Auth:PasswordHash so the current
// admin keeps its password, now logging in by email.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    if (!await db.Users.AnyAsync())
    {
        var passwordHash = app.Configuration["Auth:PasswordHash"];
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            app.Logger.LogWarning(
                "No users exist and Auth:PasswordHash is not configured — no Super Admin was seeded.");
        }
        else
        {
            var email = app.Configuration["Auth:SeedAdminEmail"] ?? "admin@recruitmentgorilla.com";
            var name = app.Configuration["Auth:SeedAdminName"] ?? "Super Admin";
            db.Users.Add(new User
            {
                Name = name,
                Email = email,
                PasswordHash = passwordHash,
                MustChangePassword = false,
                IsActive = true,
                Roles = [new UserRole { Role = Roles.SuperAdmin }],
            });
            await db.SaveChangesAsync();
            app.Logger.LogInformation("Seeded initial Super Admin '{Email}'.", email);
        }
    }
}

app.Logger.LogInformation("Recruitment.Gorilla API starting in {Environment} environment.",
    app.Environment.EnvironmentName);

app.Run();
