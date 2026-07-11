using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/candidates")]
public class CandidatesController(
    CandidateService candidateService,
    InterviewService interviewService,
    CurrentUser currentUser,
    ILogger<CandidatesController> logger) : ControllerBase
{
    // Admin+ see all candidates; a Recruiter only sees their own. Null means "no owner
    // filter". (Interviewers can't reach the candidate list/detail endpoints at all.)
    private int? ReadOwnerScope =>
        currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin) ? null : currentUser.UserId;

    // For writes, only Admin+ act on any candidate; a Recruiter is limited to their own.
    private int? WriteOwnerScope =>
        currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin) ? null : currentUser.UserId;

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await candidateService.GetAllAsync(search, status, page, pageSize, ReadOwnerScope);
        return Ok(result);
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var candidate = await candidateService.GetByIdAsync(id, ReadOwnerScope);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCandidateDto dto)
    {
        var candidateError = await candidateService.ValidateCandidateAsync(
            dto.FullName, dto.Email, dto.RoleAppliedOptionId, dto.SkillOptionIds, dto.RelevantExperience);
        if (candidateError is not null)
            return BadRequest(candidateError);

        var validationError = await candidateService.ValidateInitialStatusAsync(dto);
        if (validationError is not null)
            return BadRequest(validationError);

        var referenceError = CandidateService.ValidateReference(dto.IsReferred, dto.ReferenceName, dto.ReferenceEmail);
        if (referenceError is not null)
            return BadRequest(referenceError);

        var (created, duplicate) = await candidateService.CreateAsync(dto, currentUser.UserId, currentUser.Name);

        if (duplicate is not null)
        {
            logger.LogWarning(
                "Duplicate candidate email '{Email}' — matches existing candidate {ExistingId}.",
                dto.Email, duplicate.Id);
            return Conflict(new DuplicateCandidateDto(
                $"A candidate with email '{duplicate.Email}' already exists.", duplicate));
        }

        logger.LogInformation("Created candidate {Id} ('{Name}') by {ChangedBy}.",
            created!.Id, created.FullName, currentUser.Name);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id}/cv/{fileId}")]
    public async Task<IActionResult> GetCvFile(int id, int fileId)
    {
        // Enforce read scope before serving the file. Assigned interviewers get access to
        // the candidate's CV too (parallels the interview page bypassing owner-scope).
        if (await candidateService.GetByIdAsync(id, ReadOwnerScope) is null &&
            !await interviewService.IsAssignedInterviewerForCandidateAsync(id, currentUser.UserId ?? 0))
            return NotFound();

        var file = await candidateService.GetCvFileAsync(id, fileId);
        return file is null
            ? NotFound()
            : PhysicalFile(file.PhysicalPath, file.ContentType, file.OriginalFileName);
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await candidateService.DeleteAsync(id, WriteOwnerScope);
        if (!deleted) return NotFound();

        logger.LogInformation("Deleted candidate {Id} and its CV files.", id);
        return NoContent();
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await candidateService.GetDistinctRolesAsync();
        return Ok(roles);
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCandidateDto dto)
    {
        var candidateError = await candidateService.ValidateCandidateAsync(
            dto.FullName, dto.Email, dto.RoleAppliedOptionId, dto.SkillOptionIds, dto.RelevantExperience);
        if (candidateError is not null)
            return BadRequest(candidateError);

        var referenceError = CandidateService.ValidateReference(dto.IsReferred, dto.ReferenceName, dto.ReferenceEmail);
        if (referenceError is not null)
            return BadRequest(referenceError);

        // Block edits once the candidate's applied-for job opening has ended (applies to all roles).
        var lockError = await candidateService.GetRoleLockErrorAsync(id);
        if (lockError is not null)
            return BadRequest(lockError);

        var updated = await candidateService.UpdateAsync(id, dto, WriteOwnerScope);
        return updated is null ? NotFound() : Ok(updated);
    }

    [Authorize(Roles = Roles.CanWriteCandidate)]
    [HttpPost("{id}/status")]
    public async Task<IActionResult> AddStatus(int id, [FromBody] StatusChangeDto dto)
    {
        // Enforce write scope before validating/applying the change.
        if (await candidateService.GetByIdAsync(id, WriteOwnerScope) is null)
            return NotFound();

        var validationError = await candidateService.ValidateStatusChangeAsync(id, dto);
        if (validationError is not null)
            return BadRequest(validationError);

        var entry = await candidateService.AddStatusAsync(id, dto, currentUser.Name, currentUser.UserId);
        if (entry is null) return NotFound();

        logger.LogInformation("Candidate {Id} status changed to '{Status}' by {ChangedBy}.",
            id, dto.Status, currentUser.Name);
        return Ok(entry);
    }
}
