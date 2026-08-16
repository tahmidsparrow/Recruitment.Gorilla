using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Candidate source: validated like the role FK (must be an active option), optional, and surfaced
/// on both the list and detail projections so source-effectiveness reporting has data to read.
/// </summary>
public class CandidateServiceSourceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private async Task<CandidateSourceOption> AddSourceAsync(bool active = true)
    {
        var source = new CandidateSourceOption
        {
            Name = $"Src-{Guid.NewGuid():N}",
            SortOrder = 90,
            IsActive = active,
        };
        Db.CandidateSourceOptions.Add(source);
        await Db.SaveChangesAsync();
        return source;
    }

    [Fact]
    public async Task Source_is_optional()
    {
        var error = await Candidates().ValidateCandidateAsync(
            "Jane Doe", "jane@test.local", null, null, "3 Years", sourceOptionId: null);

        Assert.Null(error);
    }

    [Fact]
    public async Task An_unknown_source_is_rejected()
    {
        var error = await Candidates().ValidateCandidateAsync(
            "Jane Doe", "jane@test.local", null, null, "3 Years", sourceOptionId: 999999);

        Assert.Contains("source is not a valid active option", error);
    }

    [Fact]
    public async Task An_inactive_source_is_rejected()
    {
        // Soft-disabled options must stay on existing candidates but not be selectable for new ones.
        var inactive = await AddSourceAsync(active: false);

        var error = await Candidates().ValidateCandidateAsync(
            "Jane Doe", "jane@test.local", null, null, "3 Years", sourceOptionId: inactive.Id);

        Assert.Contains("source is not a valid active option", error);
    }

    [Fact]
    public async Task An_active_source_is_accepted()
    {
        var source = await AddSourceAsync();

        var error = await Candidates().ValidateCandidateAsync(
            "Jane Doe", "jane@test.local", null, null, "3 Years", sourceOptionId: source.Id);

        Assert.Null(error);
    }

    [Fact]
    public async Task Source_and_detail_round_trip_onto_the_detail_projection()
    {
        var source = await AddSourceAsync();
        var candidate = Data.AddCandidate();
        candidate.SourceOptionId = source.Id;
        candidate.SourceDetail = "  Acme Recruiting  ";
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();

        var detail = await Candidates().GetByIdAsync(candidate.Id);

        Assert.Equal(source.Id, detail!.SourceOptionId);
        Assert.Equal(source.Name, detail.Source);
        Assert.Equal("  Acme Recruiting  ", detail.SourceDetail);
    }

    [Fact]
    public async Task A_blank_source_detail_is_stored_as_null_not_an_empty_string()
    {
        var source = await AddSourceAsync();
        var dto = new UpdateCandidateDto(
            "Jane Doe", "jane@test.local", null, null, "3 Years", null, null, null, null, null, null,
            IsReferred: false, null, null, null,
            RoleAppliedOptionId: null, SkillOptionIds: null,
            SourceOptionId: source.Id, SourceDetail: "   ");
        var candidate = Data.AddCandidate();

        await Candidates().UpdateAsync(candidate.Id, dto);
        Db.ChangeTracker.Clear();

        var reloaded = await Db.Candidates.AsNoTracking().SingleAsync(c => c.Id == candidate.Id);
        Assert.Null(reloaded.SourceDetail);
        Assert.Equal(source.Id, reloaded.SourceOptionId);
    }

    [Fact]
    public async Task The_list_projection_carries_the_source_name()
    {
        var source = await AddSourceAsync();
        var candidate = Data.AddCandidate();
        candidate.SourceOptionId = source.Id;
        await Db.SaveChangesAsync();

        var page = await Candidates().GetAllAsync(null, null, 1, 500);
        var row = page.Items.Single(i => i.Id == candidate.Id);

        Assert.Equal(source.Name, row.Source);
    }
}
