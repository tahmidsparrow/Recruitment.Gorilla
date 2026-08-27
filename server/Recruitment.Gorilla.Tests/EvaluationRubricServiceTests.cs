using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Models;
using Recruitment.Gorilla.Tests.Infrastructure;

namespace Recruitment.Gorilla.Tests;

public class EvaluationRubricServiceTests(MySqlDatabaseFixture fixture) : DbTestBase(fixture)
{
    private static UpsertEvaluationRubricDto ValidRubricDto(string name = "Custom Engineering Scorecard") =>
        new(
            name,
            "Evaluation scorecard for senior software engineers",
            false,
            true,
            [
                new(null, "Technical", "SystemArchitecture", "System Architecture", "Evaluates design patterns and scalability", 1.5, 1),
                new(null, "Technical", "CodingStandards", "Coding Standards & Clean Code", "Evaluates maintainability and idiomatic code", 1.0, 2),
                new(null, "Communication", "TeamCollaboration", "Team Collaboration", "Evaluates communication and empathy", 1.0, 3),
            ]
        );

    [Fact]
    public async Task GetAllAsync_returns_seeded_default_rubric()
    {
        var rubrics = await EvaluationRubrics().GetAllAsync();

        Assert.NotEmpty(rubrics);
        var defaultRubric = rubrics.FirstOrDefault(r => r.IsDefault);
        Assert.NotNull(defaultRubric);
        Assert.Equal(12, defaultRubric.CriteriaCount);
    }

    [Fact]
    public async Task CreateAsync_creates_rubric_with_criteria_and_audit()
    {
        var admin = Data.AddUser(Roles.Admin);
        var dto = ValidRubricDto("Frontend Lead Rubric");

        var (rubric, error, conflict) = await EvaluationRubrics().CreateAsync(dto, admin.Id);

        Assert.NotNull(rubric);
        Assert.Null(error);
        Assert.False(conflict);
        Assert.Equal("Frontend Lead Rubric", rubric.Name);
        Assert.Equal(3, rubric.CriteriaCount);
        Assert.Equal(3, rubric.Criteria.Count);

        var auditLog = await Db.AuditLogs.FirstOrDefaultAsync(a => a.EntityType == "EvaluationRubric" && a.EntityId == rubric.Id);
        Assert.NotNull(auditLog);
        Assert.Equal("EvaluationRubric.Created", auditLog.Action);
    }

    [Fact]
    public async Task CreateAsync_rejects_duplicate_name()
    {
        var admin = Data.AddUser(Roles.Admin);
        var dto = ValidRubricDto("Unique Rubric Name");

        var (first, _, _) = await EvaluationRubrics().CreateAsync(dto, admin.Id);
        Assert.NotNull(first);

        var (second, error, conflict) = await EvaluationRubrics().CreateAsync(dto, admin.Id);
        Assert.Null(second);
        Assert.True(conflict);
        Assert.Contains("already exists", error);
    }

    [Fact]
    public async Task CreateAsync_rejects_duplicate_criterion_keys()
    {
        var admin = Data.AddUser(Roles.Admin);
        var dto = new UpsertEvaluationRubricDto(
            "Duplicate Keys Rubric",
            null,
            false,
            true,
            [
                new(null, "Sec1", "Key1", "Label 1", null, 1.0, 1),
                new(null, "Sec2", "Key1", "Label 2", null, 1.0, 2),
            ]
        );

        var (rubric, error, _) = await EvaluationRubrics().CreateAsync(dto, admin.Id);
        Assert.Null(rubric);
        Assert.Contains("Duplicate criterion key", error);
    }

    [Fact]
    public async Task UpdateAsync_modifies_rubric_and_replaces_criteria()
    {
        var admin = Data.AddUser(Roles.Admin);
        var (rubric, _, _) = await EvaluationRubrics().CreateAsync(ValidRubricDto("Updatable Rubric"), admin.Id);
        Assert.NotNull(rubric);

        var updateDto = new UpsertEvaluationRubricDto(
            "Updated Scorecard Title",
            "New description",
            false,
            true,
            [
                new(null, "Domain", "DomainKnowledge", "Deep Domain Knowledge", null, 2.0, 1),
            ]
        );

        var (updated, error, notFound, conflict) = await EvaluationRubrics().UpdateAsync(rubric.Id, updateDto, admin.Id);

        Assert.NotNull(updated);
        Assert.Null(error);
        Assert.False(notFound);
        Assert.False(conflict);
        Assert.Equal("Updated Scorecard Title", updated.Name);
        Assert.Equal(1, updated.CriteriaCount);
        Assert.Equal("DomainKnowledge", updated.Criteria[0].Key);
    }

    [Fact]
    public async Task CloneAsync_creates_copy_with_all_criteria()
    {
        var admin = Data.AddUser(Roles.Admin);
        var (rubric, _, _) = await EvaluationRubrics().CreateAsync(ValidRubricDto("Base Scorecard"), admin.Id);
        Assert.NotNull(rubric);

        var (cloned, error, notFound) = await EvaluationRubrics().CloneAsync(rubric.Id, admin.Id);

        Assert.NotNull(cloned);
        Assert.Null(error);
        Assert.False(notFound);
        Assert.Equal("Base Scorecard (Copy)", cloned.Name);
        Assert.Equal(3, cloned.Criteria.Count);
    }

    [Fact]
    public async Task SetDefaultAsync_designates_new_default_and_clears_old()
    {
        var admin = Data.AddUser(Roles.Admin);
        var (rubric, _, _) = await EvaluationRubrics().CreateAsync(ValidRubricDto("Next Default"), admin.Id);
        Assert.NotNull(rubric);

        var (success, error, notFound) = await EvaluationRubrics().SetDefaultAsync(rubric.Id, admin.Id);

        Assert.True(success);
        Assert.Null(error);
        Assert.False(notFound);

        var fresh = await EvaluationRubrics().GetByIdAsync(rubric.Id);
        Assert.NotNull(fresh);
        Assert.True(fresh.IsDefault);

        var defaultCount = await Db.EvaluationRubrics.CountAsync(r => r.IsDefault);
        Assert.Equal(1, defaultCount);
    }

    [Fact]
    public async Task DeleteAsync_prevents_deleting_default_rubric()
    {
        var admin = Data.AddUser(Roles.Admin);
        var defaultRubric = await Db.EvaluationRubrics.FirstAsync(r => r.IsDefault);

        var (success, error, notFound) = await EvaluationRubrics().DeleteAsync(defaultRubric.Id, admin.Id);

        Assert.False(success);
        Assert.False(notFound);
        Assert.Contains("default evaluation rubric cannot be deleted", error);
    }

    [Fact]
    public async Task DeleteAsync_allows_deleting_custom_rubric()
    {
        var admin = Data.AddUser(Roles.Admin);
        var (rubric, _, _) = await EvaluationRubrics().CreateAsync(ValidRubricDto("Deletable Rubric"), admin.Id);
        Assert.NotNull(rubric);

        var (success, error, notFound) = await EvaluationRubrics().DeleteAsync(rubric.Id, admin.Id);

        Assert.True(success);
        Assert.Null(error);
        Assert.False(notFound);

        var deleted = await EvaluationRubrics().GetByIdAsync(rubric.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task Dynamic_rubric_evaluation_flow_per_role()
    {
        var admin = Data.AddUser(Roles.Admin);
        var interviewer = Data.AddUser(Roles.Interviewer);

        // 1. Create custom rubric with 2 criteria
        var (rubric, _, _) = await EvaluationRubrics().CreateAsync(new UpsertEvaluationRubricDto(
            "QA Engineer Rubric",
            "Specialized QA scorecard",
            false,
            true,
            [
                new(null, "Testing", "AutomationSkills", "Test Automation (Selenium/Playwright)", null, 1.0, 1),
                new(null, "Testing", "ManualTestStrategy", "Manual Test Planning & Edge Cases", null, 1.0, 2),
            ]
        ), admin.Id);
        Assert.NotNull(rubric);

        // 2. Create job opening assigned to this rubric
        var roleOption = Data.AddRole("QA Automation Engineer");
        roleOption.EvaluationRubricId = rubric.Id;
        await Db.SaveChangesAsync();

        // 3. Create candidate applying for this role
        var candidate = Data.AddCandidate(roleId: roleOption.Id);
        candidate.AppliedRole = roleOption.Name;
        await Db.SaveChangesAsync();
        var interview = Data.AddInterview(candidate.Id, interviewer.Id);

        // 4. Resolve rubric for interview
        var resolvedRubric = await EvaluationRubrics().GetForInterviewAsync(interview.Id);
        Assert.NotNull(resolvedRubric);
        Assert.Equal("QA Engineer Rubric", resolvedRubric.Name);
        Assert.Equal(2, resolvedRubric.CriteriaCount);

        // 5. Submit evaluation with legacy keys fails
        var (invalidEval, invalidErr, _, _) = await Interviews().UpsertEvaluationAsync(
            interview.Id,
            interviewer.Id,
            new UpsertEvaluationDto(
                null,
                "Recommended",
                null,
                4,
                [
                    new("RelevanceOfExperience", 4, null), // legacy key not in QA rubric
                ],
                true
            )
        );
        Assert.Null(invalidEval);
        Assert.Contains("Unknown criterion", invalidErr);

        // 6. Submit evaluation with custom rubric criteria succeeds
        var (validEval, validErr, _, _) = await Interviews().UpsertEvaluationAsync(
            interview.Id,
            interviewer.Id,
            new UpsertEvaluationDto(
                "Strong candidate with solid automation framework background.",
                "Recommended",
                null,
                5,
                [
                    new("AutomationSkills", 5, "Excellent framework architecture"),
                    new("ManualTestStrategy", 4, "Good boundary testing coverage"),
                ],
                true
            )
        );

        Assert.NotNull(validEval);
        Assert.Null(validErr);
        Assert.True(validEval.IsSubmitted);
        Assert.Equal(5, validEval.OverallRating);
        Assert.Equal(2, validEval.Items.Count);
    }
}
