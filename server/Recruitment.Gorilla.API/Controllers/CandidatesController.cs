using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/candidates")]
public class CandidatesController(
    CandidateService candidateService,
    ILogger<CandidatesController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await candidateService.GetAllAsync(search, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var candidate = await candidateService.GetByIdAsync(id);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCandidateDto dto)
    {
        var candidateError = await candidateService.ValidateCandidateAsync(
            dto.FullName, dto.Email, dto.RoleAppliedOptionId, dto.SkillOptionIds);
        if (candidateError is not null)
            return BadRequest(candidateError);

        var validationError = await candidateService.ValidateInitialStatusAsync(dto);
        if (validationError is not null)
            return BadRequest(validationError);

        var referenceError = CandidateService.ValidateReference(dto.IsReferred, dto.ReferenceName, dto.ReferenceEmail);
        if (referenceError is not null)
            return BadRequest(referenceError);

        var (created, duplicate) = await candidateService.CreateAsync(dto);

        if (duplicate is not null)
        {
            logger.LogWarning(
                "Duplicate candidate email '{Email}' — matches existing candidate {ExistingId}.",
                dto.Email, duplicate.Id);
            return Conflict(new DuplicateCandidateDto(
                $"A candidate with email '{duplicate.Email}' already exists.", duplicate));
        }

        logger.LogInformation("Created candidate {Id} ('{Name}') by {ChangedBy}.",
            created!.Id, created.FullName, dto.ChangedBy);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id}/cv/{fileId}")]
    public async Task<IActionResult> GetCvFile(int id, int fileId)
    {
        var file = await candidateService.GetCvFileAsync(id, fileId);
        return file is null
            ? NotFound()
            : PhysicalFile(file.PhysicalPath, file.ContentType, file.OriginalFileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await candidateService.DeleteAsync(id);
        if (!deleted) return NotFound();

        logger.LogInformation("Deleted candidate {Id} and its CV files.", id);
        return NoContent();
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await candidateService.GetDistinctRolesAsync();
        return Ok(roles);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCandidateDto dto)
    {
        var candidateError = await candidateService.ValidateCandidateAsync(
            dto.FullName, dto.Email, dto.RoleAppliedOptionId, dto.SkillOptionIds);
        if (candidateError is not null)
            return BadRequest(candidateError);

        var referenceError = CandidateService.ValidateReference(dto.IsReferred, dto.ReferenceName, dto.ReferenceEmail);
        if (referenceError is not null)
            return BadRequest(referenceError);

        var updated = await candidateService.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> AddStatus(int id, [FromBody] StatusChangeDto dto)
    {
        var validationError = await candidateService.ValidateStatusChangeAsync(id, dto);
        if (validationError is not null)
            return BadRequest(validationError);

        var entry = await candidateService.AddStatusAsync(id, dto);
        if (entry is null) return NotFound();

        logger.LogInformation("Candidate {Id} status changed to '{Status}' by {ChangedBy}.",
            id, dto.Status, dto.ChangedBy);
        return Ok(entry);
    }
}
