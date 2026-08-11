namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Builds the (subject, HTML body) pair for each transactional email. Plain interpolated HTML with
/// inline styles (email clients don't reliably load external/`<style>` CSS) — no templating library,
/// matching the project's otherwise-lean dependency footprint.
/// </summary>
public static class EmailTemplates
{
    private static string Wrap(string title, string bodyHtml, string? actionUrl = null, string? actionLabel = null)
    {
        var action = actionUrl is null ? "" : $"""
            <p style="margin-top:20px;">
              <a href="{actionUrl}" style="background:#2b579a;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;">{actionLabel}</a>
            </p>
            """;

        return $"""
            <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
              <div style="padding:24px 0;border-bottom:2px solid #2b579a;">
                <span style="font-size:18px;font-weight:600;color:#2b579a;">Recruitment Gorilla</span>
              </div>
              <div style="padding:24px 0;">
                <h2 style="margin:0 0 12px;font-size:16px;">{title}</h2>
                {bodyHtml}
                {action}
              </div>
              <div style="padding:16px 0;border-top:1px solid #e1e1e1;font-size:12px;color:#777777;">
                This is an automated message from Recruitment Gorilla.
              </div>
            </div>
            """;
    }

    public static (string Subject, string Html) InterviewAssigned(
        string interviewerName, string candidateName, string? roleName, DateTime scheduledAt, string interviewUrl)
    {
        var subject = $"Interview assigned: {candidateName}";
        var roleLine = string.IsNullOrWhiteSpace(roleName) ? "" : $"<p>Role: {roleName}</p>";
        var body = $"""
            <p>Hi {interviewerName},</p>
            <p>You've been assigned to interview <strong>{candidateName}</strong>.</p>
            {roleLine}
            <p>Scheduled for: <strong>{scheduledAt:f}</strong></p>
            """;
        return (subject, Wrap(subject, body, interviewUrl, "View interview"));
    }

    public static (string Subject, string Html) PasswordChanged(string userName)
    {
        const string subject = "Your password was changed";
        var body = $"""
            <p>Hi {userName},</p>
            <p>Your Recruitment Gorilla account password was just changed. If you made this change, no action is needed.</p>
            <p>If you didn't make this change, contact your administrator immediately.</p>
            """;
        return (subject, Wrap(subject, body));
    }

    public static (string Subject, string Html) PasswordReset(string userName)
    {
        const string subject = "Your password was reset";
        var body = $"""
            <p>Hi {userName},</p>
            <p>An administrator reset your Recruitment Gorilla account password. Contact them to get your new temporary password, then sign in and set a new one.</p>
            """;
        return (subject, Wrap(subject, body));
    }

    public static (string Subject, string Html) AccountCreated(string userName)
    {
        const string subject = "Your Recruitment Gorilla account was created";
        var body = $"""
            <p>Hi {userName},</p>
            <p>An account was created for you on Recruitment Gorilla. Your administrator will provide your temporary password — sign in and you'll be asked to set a new one.</p>
            """;
        return (subject, Wrap(subject, body));
    }
}
