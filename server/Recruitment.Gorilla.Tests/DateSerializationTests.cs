using System.Net.Http;
using System.Text.RegularExpressions;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>
/// Asserts the contract the browser actually depends on: timestamps must reach the client marked as
/// UTC. JavaScript parses an offset-less datetime as *local*, so a missing 'Z' silently shifts every
/// displayed time by the viewer's offset. The Kind assertions in UtcDateTimeTests prove the EF layer
/// is right; only this proves what goes over the wire.
/// </summary>
[Collection(ApiCollection.Name)]
public class DateSerializationTests(ApiFixture fx)
{
    // "2026-08-20T08:30:00" with no trailing Z or offset — the shape that breaks the client.
    private static readonly Regex UnmarkedTimestamp =
        new(@"""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?""", RegexOptions.Compiled);

    private static readonly Regex MarkedTimestamp =
        new(@"""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z""", RegexOptions.Compiled);

    [Theory]
    [InlineData("/api/candidates")]
    [InlineData("/api/audit")]
    public async Task Api_serializes_timestamps_with_a_UTC_marker(string url)
    {
        var token = await fx.LoginAsync(fx.AdminEmail);
        var resp = await fx.SendAsync(HttpMethod.Get, url, token);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();

        // Guard against a vacuous pass: a payload with no timestamps at all would satisfy the
        // "no unmarked timestamp" assertion while proving nothing.
        Assert.True(MarkedTimestamp.IsMatch(json), $"{url} returned no timestamps to check.");

        var unmarked = UnmarkedTimestamp.Match(json);
        Assert.False(unmarked.Success,
            $"{url} returned a timestamp without a UTC marker: {unmarked.Value}. " +
            "Browsers parse that as local time, shifting every displayed date.");
    }

    [Fact]
    public async Task A_candidate_createdAt_ends_with_Z()
    {
        var token = await fx.LoginAsync(fx.AdminEmail);
        var resp = await fx.SendAsync(HttpMethod.Get, $"/api/candidates/{fx.CandidateId}", token);
        resp.EnsureSuccessStatusCode();

        using var doc = System.Text.Json.JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var createdAt = doc.RootElement.GetProperty("createdAt").GetString();

        Assert.NotNull(createdAt);
        Assert.EndsWith("Z", createdAt);
    }
}
