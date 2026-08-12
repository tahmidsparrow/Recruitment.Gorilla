using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Outbound-email connection settings. Bound from the "Smtp" config section as the fallback, and
/// produced (decrypted) from the DB row by <c>EmailSettingsService</c> when configured in-app.
/// </summary>
public class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Recruitment Gorilla";
    /// <summary>STARTTLS on the given port (587) when true; implicit SSL/TLS (465) when false.</summary>
    public bool UseStartTls { get; set; } = true;
}

/// <summary>The actual network send, isolated behind an interface so tests can substitute a fake.</summary>
public interface ISmtpTransport
{
    Task SendAsync(MimeMessage message, SmtpOptions options, CancellationToken ct = default);
}

public class MailKitSmtpTransport : ISmtpTransport
{
    public async Task SendAsync(MimeMessage message, SmtpOptions options, CancellationToken ct = default)
    {
        using var client = new SmtpClient();
        var secure = options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect;
        await client.ConnectAsync(options.Host, options.Port, secure, ct);
        if (!string.IsNullOrWhiteSpace(options.User))
            await client.AuthenticateAsync(options.User, options.Password ?? string.Empty, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}

/// <summary>
/// Sends transactional email (interview assignment, password/account notices). SMTP settings are
/// resolved at send time by <see cref="EmailSettingsResolver"/> (DB row if configured in-app, else
/// the <c>Smtp</c> config fallback). Best-effort — a send failure is logged but never bubbles up, so
/// a dead mailbox can't break the underlying operation (mirrors <see cref="AuditService"/>).
/// </summary>
public class EmailService(IEmailSettingsResolver settings, ISmtpTransport transport, ILogger<EmailService> logger)
{
    /// <summary>Best-effort send — a failure is logged and swallowed, never bubbling up.</summary>
    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        try
        {
            await SendCoreAsync(toEmail, toName, subject, htmlBody);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send email '{Subject}' to {ToEmail}.", subject, toEmail);
        }
    }

    /// <summary>
    /// Send that surfaces the outcome — for the admin "send test" flow, where the caller needs to
    /// know whether SMTP actually worked. Throws <see cref="InvalidOperationException"/> when SMTP
    /// isn't configured; otherwise lets transport exceptions propagate.
    /// </summary>
    public Task SendTestAsync(string toEmail, string toName, string subject, string htmlBody) =>
        SendCoreAsync(toEmail, toName, subject, htmlBody);

    private async Task SendCoreAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new InvalidOperationException("No recipient email address.");

        var options = await settings.ResolveAsync();
        if (string.IsNullOrWhiteSpace(options.Host) || string.IsNullOrWhiteSpace(options.FromAddress))
            throw new InvalidOperationException("SMTP is not configured. Set the host and from-address first.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.FromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        await transport.SendAsync(message, options);
    }
}
