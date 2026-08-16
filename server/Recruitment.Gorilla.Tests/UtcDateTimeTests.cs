using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Every DateTime in this database is UTC by convention, but MySQL datetime(6) stores no offset —
/// so values must be re-marked as UTC on read. Without that they materialize as Unspecified and
/// serialize without a trailing 'Z', which browsers then parse as local time.
/// Each test clears the change tracker first: otherwise the query returns the still-tracked
/// instance (which kept its original Kind) and passes without touching the database at all.
/// </summary>
public class UtcDateTimeTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    [Fact]
    public async Task DateTime_read_back_from_the_database_is_marked_Utc()
    {
        var candidate = Data.AddCandidate();
        Db.ChangeTracker.Clear();

        var reloaded = await Db.Candidates.AsNoTracking().SingleAsync(c => c.Id == candidate.Id);

        Assert.Equal(DateTimeKind.Utc, reloaded.CreatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, reloaded.UpdatedAt.Kind);
    }

    [Fact]
    public async Task Nullable_DateTime_read_back_is_marked_Utc_and_null_stays_null()
    {
        var user = Data.AddUser(Recruitment.Gorilla.API.Auth.Roles.Recruiter);
        var candidate = Data.AddCandidate(ownerUserId: user.Id);
        var interview = Data.AddInterview(candidate.Id, user.Id);
        var evaluation = Data.AddSubmittedEvaluation(interview.Id, user.Id);
        Db.ChangeTracker.Clear();

        var reloaded = await Db.InterviewEvaluations.AsNoTracking().SingleAsync(e => e.Id == evaluation.Id);

        Assert.NotNull(reloaded.SubmittedAt);
        Assert.Equal(DateTimeKind.Utc, reloaded.SubmittedAt!.Value.Kind);

        // A null DateTime? must survive as null rather than becoming a default instant.
        var freshUser = await Db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
        Assert.Null(freshUser.LastLoginAt);
    }

    [Fact]
    public async Task A_stored_instant_survives_the_round_trip_unchanged()
    {
        // Whole seconds: datetime(6) is microsecond-precision, so sub-microsecond ticks would truncate.
        var instant = new DateTime(2026, 8, 20, 8, 30, 0, DateTimeKind.Utc);
        var candidate = Data.AddCandidate();
        candidate.CreatedAt = instant;
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();

        var reloaded = await Db.Candidates.AsNoTracking().SingleAsync(c => c.Id == candidate.Id);

        // The converter must re-label the Kind, never shift the value.
        Assert.Equal(instant, reloaded.CreatedAt);
        Assert.Equal(DateTimeKind.Utc, reloaded.CreatedAt.Kind);
    }
}
