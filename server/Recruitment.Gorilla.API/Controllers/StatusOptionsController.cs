using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/status-options")]
public class StatusOptionsController(StatusOptionService statusOptionService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetActive()
    {
        var statuses = await statusOptionService.GetActiveAsync();
        return Ok(statuses);
    }

    [HttpGet("initial")]
    public async Task<IActionResult> GetInitial()
    {
        var statuses = await statusOptionService.GetInitialAsync();
        return Ok(statuses);
    }

    [HttpGet("next/{candidateId:int}")]
    public async Task<IActionResult> GetNext(int candidateId)
    {
        var statuses = await statusOptionService.GetNextForCandidateAsync(candidateId);
        return statuses is null ? NotFound() : Ok(statuses);
    }
}
