using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize(Roles = Roles.AdminOrAbove)]
[Route("api/config")]
public class ConfigurationController(
    ConfigurationService config,
    AuditService audit,
    ILogger<ConfigurationController> logger) : ControllerBase
{
    // ----- Role Applied -----

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles([FromQuery] bool includeInactive = false) =>
        Ok(includeInactive ? await config.GetAllRolesAsync() : await config.GetActiveRolesAsync());

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] UpsertRoleAppliedOptionDto dto)
    {
        var (created, conflict, error) = await config.CreateRoleAsync(dto);
        if (error is not null) return BadRequest(error);
        if (conflict) return Conflict("A role with that name already exists.");

        logger.LogInformation("Created role option {Id} ('{Name}').", created!.Id, created.Name);
        await audit.RecordAsync("Role.Created", "Role", created.Id, $"Created role '{created.Name}' (#{created.Id})");
        return Ok(created);
    }

    [HttpPut("roles/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpsertRoleAppliedOptionDto dto)
    {
        var (updated, notFound, conflict, error) = await config.UpdateRoleAsync(id, dto);
        if (error is not null) return BadRequest(error);
        if (notFound) return NotFound();
        if (conflict) return Conflict("A role with that name already exists.");

        logger.LogInformation("Updated role option {Id}.", id);
        await audit.RecordAsync("Role.Updated", "Role", id, $"Updated role '{updated!.Name}' (#{id})");
        return Ok(updated);
    }

    // Only a Super Admin may delete a role (overrides the class-level Admin+ policy).
    [Authorize(Roles = Roles.SuperAdmin)]
    [HttpDelete("roles/{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var (found, deleted, deactivated, candidateCount) = await config.DeleteRoleAsync(id);
        if (!found) return NotFound();
        logger.LogInformation("Role option {Id} {Action} ({Count} candidates).",
            id, deleted ? "deleted" : "deactivated", candidateCount);
        await audit.RecordAsync("Role.Deleted", "Role", id,
            $"{(deleted ? "Deleted" : "Deactivated")} role #{id}" + (deactivated ? $" ({candidateCount} candidate(s))" : ""));
        return Ok(new { deleted, deactivated, candidateCount });
    }

    // ----- Skills -----

    [HttpGet("skills")]
    public async Task<IActionResult> GetSkills([FromQuery] bool includeInactive = false) =>
        Ok(includeInactive ? await config.GetAllSkillsAsync() : await config.GetActiveSkillsAsync());

    [HttpPost("skills")]
    public async Task<IActionResult> CreateSkill([FromBody] UpsertSkillOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (created, conflict) = await config.CreateSkillAsync(dto);
        if (conflict) return Conflict("A skill with that name already exists.");

        logger.LogInformation("Created skill option {Id} ('{Name}').", created!.Id, created.Name);
        await audit.RecordAsync("Skill.Created", "Skill", created.Id, $"Created skill '{created.Name}' (#{created.Id})");
        return Ok(created);
    }

    [HttpPut("skills/{id:int}")]
    public async Task<IActionResult> UpdateSkill(int id, [FromBody] UpsertSkillOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (updated, notFound, conflict) = await config.UpdateSkillAsync(id, dto);
        if (notFound) return NotFound();
        if (conflict) return Conflict("A skill with that name already exists.");

        logger.LogInformation("Updated skill option {Id}.", id);
        await audit.RecordAsync("Skill.Updated", "Skill", id, $"Updated skill '{updated!.Name}' (#{id})");
        return Ok(updated);
    }

    [HttpDelete("skills/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        var ok = await config.DeleteSkillAsync(id);
        if (!ok) return NotFound();
        logger.LogInformation("Deleted/disabled skill option {Id}.", id);
        await audit.RecordAsync("Skill.Deleted", "Skill", id, $"Deleted/disabled skill #{id}");
        return NoContent();
    }

    // ----- Interview types -----

    [HttpGet("interview-types")]
    public async Task<IActionResult> GetInterviewTypes([FromQuery] bool includeInactive = false) =>
        Ok(includeInactive ? await config.GetAllInterviewTypesAsync() : await config.GetActiveInterviewTypesAsync());

    [HttpPost("interview-types")]
    public async Task<IActionResult> CreateInterviewType([FromBody] UpsertInterviewTypeOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (created, conflict) = await config.CreateInterviewTypeAsync(dto);
        if (conflict) return Conflict("An interview type with that name already exists.");

        logger.LogInformation("Created interview type option {Id} ('{Name}').", created!.Id, created.Name);
        await audit.RecordAsync("InterviewType.Created", "InterviewType", created.Id, $"Created interview type '{created.Name}' (#{created.Id})");
        return Ok(created);
    }

    [HttpPut("interview-types/{id:int}")]
    public async Task<IActionResult> UpdateInterviewType(int id, [FromBody] UpsertInterviewTypeOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (updated, notFound, conflict) = await config.UpdateInterviewTypeAsync(id, dto);
        if (notFound) return NotFound();
        if (conflict) return Conflict("An interview type with that name already exists.");

        logger.LogInformation("Updated interview type option {Id}.", id);
        await audit.RecordAsync("InterviewType.Updated", "InterviewType", id, $"Updated interview type '{updated!.Name}' (#{id})");
        return Ok(updated);
    }

    [HttpDelete("interview-types/{id:int}")]
    public async Task<IActionResult> DeleteInterviewType(int id)
    {
        var ok = await config.DeleteInterviewTypeAsync(id);
        if (!ok) return NotFound();
        logger.LogInformation("Deleted/disabled interview type option {Id}.", id);
        await audit.RecordAsync("InterviewType.Deleted", "InterviewType", id, $"Deleted/disabled interview type #{id}");
        return NoContent();
    }
}
