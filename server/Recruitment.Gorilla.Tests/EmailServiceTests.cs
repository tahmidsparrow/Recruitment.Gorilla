using Microsoft.Extensions.Logging.Abstractions;
using MimeKit;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.Tests;

/// <summary>EmailService: best-effort send — pure, no DB, no real network (fake ISmtpTransport + resolver).</summary>
public class EmailServiceTests
{
    private sealed class RecordingTransport : ISmtpTransport
    {
        public MimeMessage? Sent;
        public Task SendAsync(MimeMessage message, SmtpOptions options, CancellationToken ct = default)
        {
            Sent = message;
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingTransport : ISmtpTransport
    {
        public Task SendAsync(MimeMessage message, SmtpOptions options, CancellationToken ct = default) =>
            throw new InvalidOperationException("connection refused");
    }

    private sealed class FakeResolver(SmtpOptions options) : IEmailSettingsResolver
    {
        public Task<SmtpOptions> ResolveAsync() => Task.FromResult(options);
    }

    private static EmailService Email(ISmtpTransport transport, SmtpOptions? options = null) => new(
        new FakeResolver(options ?? new SmtpOptions { Host = "smtp.test.local", FromAddress = "noreply@test.local" }),
        transport, NullLogger<EmailService>.Instance);

    [Fact]
    public async Task SendAsync_passes_recipient_subject_and_body_to_the_transport()
    {
        var transport = new RecordingTransport();
        await Email(transport).SendAsync("candidate@example.com", "Jane Doe", "Hello", "<p>Hi</p>");

        Assert.NotNull(transport.Sent);
        Assert.Equal("candidate@example.com", transport.Sent!.To.Mailboxes.Single().Address);
        Assert.Equal("Jane Doe", transport.Sent.To.Mailboxes.Single().Name);
        Assert.Equal("Hello", transport.Sent.Subject);
        Assert.Equal("noreply@test.local", transport.Sent.From.Mailboxes.Single().Address);
    }

    [Fact]
    public async Task SendAsync_skips_silently_when_smtp_is_not_configured()
    {
        var transport = new RecordingTransport();
        await Email(transport, new SmtpOptions()).SendAsync("a@b.com", "A", "Subject", "<p>x</p>");

        Assert.Null(transport.Sent); // never reached the transport
    }

    [Fact]
    public async Task SendAsync_swallows_a_transport_failure_and_never_throws()
    {
        var ex = await Record.ExceptionAsync(() =>
            Email(new ThrowingTransport()).SendAsync("a@b.com", "A", "Subject", "<p>x</p>"));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ignores_a_blank_recipient()
    {
        var transport = new RecordingTransport();
        await Email(transport).SendAsync("", "A", "Subject", "<p>x</p>");

        Assert.Null(transport.Sent);
    }
}
