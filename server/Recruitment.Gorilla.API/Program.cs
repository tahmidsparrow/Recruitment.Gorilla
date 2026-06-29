using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Data;
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

builder.Services.AddScoped<CandidateService>();
builder.Services.AddScoped<CVParserService>();

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
app.UseAuthorization();
app.MapControllers();

app.Logger.LogInformation("Recruitment.Gorilla API starting in {Environment} environment.",
    app.Environment.EnvironmentName);

app.Run();
