using Microsoft.EntityFrameworkCore;
using MimeKit;
using Recruitment.Gorilla.API.Services;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>NotificationService.NotifyAsync: the shared in-app + email dispatch path.</summary>
public class NotificationServiceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
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

    [Fact]
    public async Task NotifyAsync_writes_the_in_app_notification_and_sends_the_email()
    {
        var user = Data.AddUser("Interviewer", name: "Ivy Interviewer");
        var transport = new RecordingTransport();

        await new NotificationService(Db, TestEmail(transport)).NotifyAsync(
            user.Id, "Interview assigned", "You have been assigned.", "/interviews/1",
            "Interview assigned: Jane Doe", "<p>body</p>");

        var notification = await Db.Notifications.SingleAsync(n => n.UserId == user.Id);
        Assert.Equal("Interview assigned", notification.Title);
        Assert.Equal("/interviews/1", notification.LinkUrl);

        Assert.NotNull(transport.Sent);
        Assert.Equal(user.Email, transport.Sent!.To.Mailboxes.Single().Address);
        Assert.Equal("Interview assigned: Jane Doe", transport.Sent.Subject);
    }

    [Fact]
    public async Task NotifyAsync_writes_the_notification_without_an_email_when_none_is_supplied()
    {
        var user = Data.AddUser("Interviewer");
        var transport = new RecordingTransport();

        await new NotificationService(Db, TestEmail(transport)).NotifyAsync(
            user.Id, "Title", "Message", null);

        Assert.True(await Db.Notifications.AnyAsync(n => n.UserId == user.Id));
        Assert.Null(transport.Sent);
    }

    [Fact]
    public async Task NotifyAsync_still_records_the_notification_when_the_email_send_fails()
    {
        var user = Data.AddUser("Interviewer");

        await new NotificationService(Db, TestEmail(new ThrowingTransport())).NotifyAsync(
            user.Id, "Title", "Message", null, "Subject", "<p>x</p>");

        Assert.True(await Db.Notifications.AnyAsync(n => n.UserId == user.Id));
    }
}
