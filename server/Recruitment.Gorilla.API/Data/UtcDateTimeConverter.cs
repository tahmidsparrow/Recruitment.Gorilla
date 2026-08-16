using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Recruitment.Gorilla.API.Data;

/// <summary>
/// Every DateTime in this database is UTC by convention — writes use <c>DateTime.UtcNow</c> and the
/// client converts with <c>toISOString()</c> before sending. MySQL <c>datetime(6)</c> stores no offset,
/// though, so values materialize as <see cref="DateTimeKind.Unspecified"/>; System.Text.Json then emits
/// them without a trailing 'Z' and browsers parse that as *local* time, shifting every displayed
/// timestamp by the viewer's offset. Re-label the Kind on read so the wire format is honest and
/// <c>ToLocalTime</c>/comparisons behave in C# too. This only labels — it never shifts the value.
/// </summary>
public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter() : base(
        // Defensive: a stray DateTime.Now would otherwise be stored as a local wall-clock.
        v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : v,
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    { }
}

/// <inheritdoc cref="UtcDateTimeConverter"/>
public class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter() : base(
        v => v.HasValue && v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : v,
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
    { }
}
