using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// EmailSettingsService/Resolver: password encrypted at rest, blank-keeps-existing, GET never leaks
/// the secret, and resolve prefers the DB row with a config fallback.
/// </summary>
public class EmailSettingsServiceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private static SecretProtector Protector() =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Encryption:Key"] = "unit-test-encryption-key-32bytes!!" })
            .Build());

    private static IOptions<SmtpOptions> Fallback(SmtpOptions? o = null) => Options.Create(o ?? new SmtpOptions());

    private EmailSettingsService Service(SecretProtector p, IOptions<SmtpOptions> fb) =>
        new(Db, p, fb, new AuditService(Db, new CurrentUser(new HttpContextAccessor()), NullLogger<AuditService>.Instance));

    private EmailSettingsResolver Resolver(SecretProtector p, IOptions<SmtpOptions> fb) =>
        new(Db, p, fb, NullLogger<EmailSettingsResolver>.Instance);

    private static UpsertEmailSettingsDto Dto(string? password) => new(
        Host: "smtp.example.com", Port: 587, User: "user@example.com", Password: password,
        FromAddress: "from@example.com", FromName: "RG", UseStartTls: true, Enabled: true);

    [Fact]
    public async Task Save_encrypts_the_password_and_resolve_round_trips_it()
    {
        var p = Protector();
        await Service(p, Fallback()).SaveAsync(Dto("s3cret-app-pw"), actorUserId: 1);

        var row = Db.EmailSettings.Single();
        Assert.NotNull(row.PasswordEncrypted);
        Assert.NotEqual("s3cret-app-pw", row.PasswordEncrypted);            // stored ciphertext, not plaintext

        var resolved = await Resolver(p, Fallback()).ResolveAsync();
        Assert.Equal("s3cret-app-pw", resolved.Password);                    // decrypts back
        Assert.Equal("smtp.example.com", resolved.Host);
    }

    [Fact]
    public async Task Blank_password_on_update_keeps_the_existing_secret()
    {
        var p = Protector();
        var svc = Service(p, Fallback());
        await svc.SaveAsync(Dto("original-pw"), actorUserId: 1);

        // Update host/port only, password blank → keep the stored one.
        await svc.SaveAsync(Dto(null) with { Host = "smtp.new.com" }, actorUserId: 1);

        var resolved = await Resolver(p, Fallback()).ResolveAsync();
        Assert.Equal("smtp.new.com", resolved.Host);
        Assert.Equal("original-pw", resolved.Password);                      // unchanged
    }

    [Fact]
    public async Task Get_never_returns_the_password_and_reports_passwordSet()
    {
        var p = Protector();
        var svc = Service(p, Fallback());

        var before = await svc.GetAsync();
        Assert.False(before.PasswordSet);

        await svc.SaveAsync(Dto("pw"), actorUserId: 1);
        var after = await svc.GetAsync();
        Assert.True(after.PasswordSet);
        // The DTO has no password member at all — nothing to leak — assert the visible fields instead.
        Assert.Equal("smtp.example.com", after.Host);
        Assert.True(after.Enabled);
    }

    [Fact]
    public async Task Resolve_falls_back_to_config_when_no_row_or_disabled()
    {
        var p = Protector();
        var fallback = Fallback(new SmtpOptions { Host = "fallback.smtp", FromAddress = "cfg@x.com" });

        // No row → fallback.
        var resolved = await Resolver(p, fallback).ResolveAsync();
        Assert.Equal("fallback.smtp", resolved.Host);

        // Disabled row → still fallback.
        await Service(p, fallback).SaveAsync(Dto("pw") with { Enabled = false }, actorUserId: 1);
        var resolved2 = await Resolver(p, fallback).ResolveAsync();
        Assert.Equal("fallback.smtp", resolved2.Host);
    }
}
