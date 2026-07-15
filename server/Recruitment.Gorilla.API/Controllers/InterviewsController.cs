using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/interviews")]
public class InterviewsController(
    InterviewService interviews,
    ConfigurationService config,
    AuditService audit,
    CurrentUser currentUser,
    ILogger<InterviewsController> logger) : ControllerBase
{
    private bool IsAdmin => currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin);

    /// <summary>Active users that can be assigned as interviewers.</summary>
    [HttpGet("assignable-users")]
    public async Task<IActionResult> GetAssignableUsers() =>
        Ok(await interviews.GetAssignableUsersAsync());

    /// <summary>Active interview type tags for the schedule form (readable by any authorized user).</summary>
    [HttpGet("types")]
    public async Task<IActionResult> GetInterviewTypes() =>
        Ok(await config.GetActiveInterviewTypesAsync());

    /// <summary>Interviews the current user is assigned to.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        if (currentUser.UserId is not int userId) return Unauthorized();
        return Ok(await interviews.GetMineAsync(userId));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (currentUser.UserId is not int userId) return Unauthorized();
        var detail = await interviews.GetDetailAsync(id, userId, IsAdmin);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPut("{id:int}/evaluation")]
    public async Task<IActionResult> SaveEvaluation(int id, [FromBody] UpsertEvaluationDto dto)
    {
        if (currentUser.UserId is not int userId) return Unauthorized();

        var (result, error, notFound, conflict) = await interviews.UpsertEvaluationAsync(id, userId, dto);
        if (notFound) return NotFound();
        if (conflict) return Conflict(new { message = error });
        if (error is not null) return BadRequest(new { message = error });

        logger.LogInformation("User {UserId} {Action} evaluation for interview {InterviewId}.",
            userId, dto.Submit ? "submitted" : "saved", id);
        if (dto.Submit)
            await audit.RecordAsync("Interview.EvaluationSubmitted", "Interview", id,
                $"Submitted evaluation for interview #{id}");
        return Ok(result);
    }
}
