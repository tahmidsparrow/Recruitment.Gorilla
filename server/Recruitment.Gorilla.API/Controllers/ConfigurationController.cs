using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/config")]
public class ConfigurationController(
    ConfigurationService config,
    ILogger<ConfigurationController> logger) : ControllerBase
{
    // ----- Role Applied -----

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles([FromQuery] bool includeInactive = false) =>
        Ok(includeInactive ? await config.GetAllRolesAsync() : await config.GetActiveRolesAsync());

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] UpsertRoleAppliedOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (created, conflict) = await config.CreateRoleAsync(dto);
        if (conflict) return Conflict("A role with that name already exists.");

        logger.LogInformation("Created role option {Id} ('{Name}').", created!.Id, created.Name);
        return Ok(created);
    }

    [HttpPut("roles/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpsertRoleAppliedOptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var (updated, notFound, conflict) = await config.UpdateRoleAsync(id, dto);
        if (notFound) return NotFound();
        if (conflict) return Conflict("A role with that name already exists.");

        logger.LogInformation("Updated role option {Id}.", id);
        return Ok(updated);
    }

    [HttpDelete("roles/{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var ok = await config.DeleteRoleAsync(id);
        if (!ok) return NotFound();
        logger.LogInformation("Deleted/disabled role option {Id}.", id);
        return NoContent();
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
        return Ok(updated);
    }

    [HttpDelete("skills/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id)
    {
        var ok = await config.DeleteSkillAsync(id);
        if (!ok) return NotFound();
        logger.LogInformation("Deleted/disabled skill option {Id}.", id);
        return NoContent();
    }
}
