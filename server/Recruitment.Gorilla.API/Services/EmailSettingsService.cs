using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Services;

/// <summary>Resolves the effective SMTP options at send time (behind an interface so tests can fake it).</summary>
public interface IEmailSettingsResolver
{
    Task<SmtpOptions> ResolveAsync();
}

/// <summary>
/// Produces the effective <see cref="SmtpOptions"/> used at send time: the in-app DB row when it
/// exists and is enabled (password decrypted), otherwise the <c>Smtp</c> config fallback. Kept
/// separate from <see cref="EmailSettingsService"/> so <see cref="EmailService"/> has a minimal
/// dependency (no audit) and there's no risk of a dependency cycle.
/// </summary>
public class EmailSettingsResolver(
    AppDbContext db, SecretProtector protector, IOptions<SmtpOptions> fallback, ILogger<EmailSettingsResolver> logger)
    : IEmailSettingsResolver
{
    public const int RowId = 1;

    public async Task<SmtpOptions> ResolveAsync()
    {
        var row = await db.EmailSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == RowId);
        if (row is null || !row.Enabled || string.IsNullOrWhiteSpace(row.Host) || string.IsNullOrWhiteSpace(row.FromAddress))
            return fallback.Value;

        string? password = null;
        if (!string.IsNullOrEmpty(row.PasswordEncrypted))
        {
            try
            {
                password = protector.Unprotect(row.PasswordEncrypted);
            }
            catch (Exception ex)
            {
                // Undecryptable (e.g. Encryption:Key changed) → fall back rather than send with no auth.
                logger.LogWarning(ex, "Could not decrypt the stored SMTP password; falling back to Smtp config.");
                return fallback.Value;
            }
        }

        return new SmtpOptions
        {
            Host = row.Host,
            Port = row.Port,
            User = row.User,
            Password = password,
            FromAddress = row.FromAddress,
            FromName = row.FromName,
            UseStartTls = row.UseStartTls,
        };
    }
}

/// <summary>
/// Admin control-panel CRUD for the SMTP settings (SuperAdmin). Reads never expose the password;
/// writes encrypt it via <see cref="SecretProtector"/> and only replace it when a new one is given.
/// </summary>
public class EmailSettingsService(
    AppDbContext db, SecretProtector protector, IOptions<SmtpOptions> fallback, AuditService audit)
{
    public async Task<EmailSettingsDto> GetAsync()
    {
        var row = await db.EmailSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == EmailSettingsResolver.RowId);
        if (row is null)
        {
            // No row yet — seed the form from the config fallback (non-secret fields only).
            var cfg = fallback.Value;
            return new EmailSettingsDto(
                cfg.Host, cfg.Port, cfg.User, cfg.FromAddress, cfg.FromName, cfg.UseStartTls,
                Enabled: false, PasswordSet: false, UpdatedAt: null);
        }

        return new EmailSettingsDto(
            row.Host, row.Port, row.User, row.FromAddress, row.FromName, row.UseStartTls,
            row.Enabled, PasswordSet: !string.IsNullOrEmpty(row.PasswordEncrypted), row.UpdatedAt);
    }

    public async Task SaveAsync(UpsertEmailSettingsDto dto, int? actorUserId, string? actorName = null)
    {
        var row = await db.EmailSettings.FirstOrDefaultAsync(s => s.Id == EmailSettingsResolver.RowId);
        if (row is null)
        {
            row = new EmailSetting { Id = EmailSettingsResolver.RowId };
            db.EmailSettings.Add(row);
        }

        row.Host = dto.Host.Trim();
        row.Port = dto.Port;
        row.User = string.IsNullOrWhiteSpace(dto.User) ? null : dto.User.Trim();
        row.FromAddress = dto.FromAddress.Trim();
        row.FromName = string.IsNullOrWhiteSpace(dto.FromName) ? "Recruitment Gorilla" : dto.FromName.Trim();
        row.UseStartTls = dto.UseStartTls;
        row.Enabled = dto.Enabled;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedByUserId = actorUserId;

        // Only replace the password when a new one is supplied; blank keeps the existing secret.
        if (!string.IsNullOrWhiteSpace(dto.Password))
            row.PasswordEncrypted = protector.Protect(dto.Password.Trim());

        await db.SaveChangesAsync();

        // Never record the password in the audit trail. Uses this method's own actorUserId
        // parameter (already required for row.UpdatedByUserId above), not the CurrentUser-implicit
        // overload — SaveAsync has no HTTP-request dependency otherwise, and shouldn't gain one here.
        await audit.RecordAsync("Config.EmailUpdated", actorUserId, actorName, "EmailSetting", row.Id,
            $"Updated SMTP settings (host '{row.Host}', enabled {row.Enabled})");
    }
}
