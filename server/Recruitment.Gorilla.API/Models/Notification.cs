namespace Recruitment.Gorilla.API.Models;

/// <summary>In-app notification for a user (e.g. an interview assignment).</summary>
public class Notification
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Client route to open when clicked, e.g. /interviews/5.</summary>
    public string? LinkUrl { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
