using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

/// <summary>InterviewService.UpsertEvaluationAsync — access, the submit gate, submit-lock, and field validation.</summary>
public class InterviewServiceEvaluationTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private static List<EvaluationItemDto> AllRated(int rating = 4) =>
        EvaluationCriteria.Keys.Select(k => new EvaluationItemDto(k, rating, null)).ToList();

    private static UpsertEvaluationDto Eval(
        bool submit, string? recommendation = "Recommended", string? recommendationOther = null,
        int? overall = 4, List<EvaluationItemDto>? items = null) =>
        new(null, recommendation, recommendationOther, overall, items ?? AllRated(), submit);

    /// <summary>Sets up an interview with one assigned interviewer; returns (interviewId, interviewerUserId).</summary>
    private (int InterviewId, int UserId) Assigned()
    {
        var interviewer = Data.AddUser(Roles.Interviewer);
        var candidate = Data.AddCandidate();
        var interview = Data.AddInterview(candidate.Id, interviewer.Id);
        return (interview.Id, interviewer.Id);
    }

    [Fact]
    public async Task NonAssigned_user_is_not_found()
    {
        var (interviewId, _) = Assigned();
        var stranger = Data.AddUser(Roles.Interviewer);

        var (_, _, notFound, _) = await Interviews().UpsertEvaluationAsync(interviewId, stranger.Id, Eval(submit: false));
        Assert.True(notFound);
    }

    [Fact]
    public async Task Draft_with_partial_data_is_allowed()
    {
        var (interviewId, userId) = Assigned();

        var (dto, error, notFound, conflict) = await Interviews().UpsertEvaluationAsync(
            interviewId, userId, Eval(submit: false, recommendation: null, overall: null, items: [AllRated()[0]]));

        Assert.NotNull(dto);
        Assert.Null(error);
        Assert.False(notFound);
        Assert.False(conflict);
    }

    [Fact]
    public async Task Submit_requires_recommendation_overall_and_all_twelve_ratings()
    {
        var (interviewId, userId) = Assigned();

        var missingRec = await Interviews().UpsertEvaluationAsync(interviewId, userId, Eval(submit: true, recommendation: null));
        Assert.Contains("recommendation is required", missingRec.Error);

        var missingOverall = await Interviews().UpsertEvaluationAsync(interviewId, userId, Eval(submit: true, overall: null));
        Assert.Contains("overall rating is required", missingOverall.Error);

        var elevenRated = AllRated().Take(11).ToList();
        var incomplete = await Interviews().UpsertEvaluationAsync(interviewId, userId, Eval(submit: true, items: elevenRated));
        Assert.Contains("rate all evaluation criteria", incomplete.Error);
    }

    [Fact]
    public async Task Complete_submit_locks_and_a_second_submit_conflicts()
    {
        var (interviewId, userId) = Assigned();

        var first = await Interviews().UpsertEvaluationAsync(interviewId, userId, Eval(submit: true));
        Assert.Null(first.Error);
        Assert.NotNull(first.Dto);
        Assert.True(first.Dto!.IsSubmitted);

        var second = await Interviews().UpsertEvaluationAsync(interviewId, userId, Eval(submit: true));
        Assert.True(second.Conflict);
    }

    [Fact]
    public async Task Invalid_criterion_key_and_out_of_range_rating_are_rejected()
    {
        var (interviewId, userId) = Assigned();

        var badKey = await Interviews().UpsertEvaluationAsync(
            interviewId, userId, Eval(submit: false, items: [new EvaluationItemDto("NotAKey", 3, null)]));
        Assert.Contains("Unknown criterion", badKey.Error);

        var badRating = await Interviews().UpsertEvaluationAsync(
            interviewId, userId, Eval(submit: false, items: [new EvaluationItemDto(EvaluationCriteria.Keys.First(), 6, null)]));
        Assert.Contains("between 1 and 5", badRating.Error);
    }

    [Fact]
    public async Task Recommendation_Other_requires_specify_text()
    {
        var (interviewId, userId) = Assigned();

        var missing = await Interviews().UpsertEvaluationAsync(
            interviewId, userId, Eval(submit: false, recommendation: "Other", recommendationOther: null));
        Assert.Contains("specify", missing.Error);

        var ok = await Interviews().UpsertEvaluationAsync(
            interviewId, userId, Eval(submit: false, recommendation: "Other", recommendationOther: "Second round"));
        Assert.Null(ok.Error);
    }
}
