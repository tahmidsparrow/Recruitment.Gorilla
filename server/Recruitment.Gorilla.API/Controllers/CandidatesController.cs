using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Route("api/candidates")]
public class CandidatesController(CandidateService candidateService) : ControllerBase
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
        var (created, duplicate) = await candidateService.CreateAsync(dto);

        if (duplicate is not null)
            return Conflict(new DuplicateCandidateDto(
                $"A candidate with email '{duplicate.Email}' already exists.", duplicate));

        return CreatedAtAction(nameof(GetById), new { id = created!.Id }, created);
    }

    [HttpGet("{id}/cv/{fileId}")]
    public async Task<IActionResult> GetCvFile(int id, int fileId)
    {
        var file = await candidateService.GetCvFileAsync(id, fileId);
        return file is null
            ? NotFound()
            : PhysicalFile(file.PhysicalPath, file.ContentType, file.OriginalFileName);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCandidateDto dto)
    {
        var updated = await candidateService.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> AddStatus(int id, [FromBody] StatusChangeDto dto)
    {
        var entry = await candidateService.AddStatusAsync(id, dto);
        return entry is null ? NotFound() : Ok(entry);
    }
}
