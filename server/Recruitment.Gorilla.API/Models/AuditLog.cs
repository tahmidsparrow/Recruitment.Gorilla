namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// Append-only record of a security- or data-relevant action ("who changed what, when"). Written by
/// <see cref="Services.AuditService"/> at the app's write points; never updated or deleted.
/// </summary>
public class AuditLog
{
    public int Id { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>The acting user's id; null for anonymous events (e.g. a failed login).</summary>
    public int? ActorUserId { get; set; }

    /// <summary>The acting user's display name, or the attempted email on a failed login.</summary>
    public string ActorName { get; set; } = "Unknown";

    /// <summary>Dotted verb, e.g. "Candidate.Deleted", "Auth.LoginFailed", "User.PasswordReset".</summary>
    public string Action { get; set; } = string.Empty;

    public string? EntityType { get; set; }
    public int? EntityId { get; set; }

    /// <summary>Human-readable one-liner, e.g. "Deleted candidate 'Jane Doe' (#44)".</summary>
    public string? Summary { get; set; }

    /// <summary>Optional JSON with extra context — never secrets/passwords.</summary>
    public string? Details { get; set; }
}
