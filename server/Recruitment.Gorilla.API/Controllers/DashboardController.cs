using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController(DashboardService dashboardService, CurrentUser currentUser) : ControllerBase
{
    // Same read scope as CandidatesController: recruiters only see their own candidates.
    private int? ReadOwnerScope =>
        currentUser.IsInAnyRole(Roles.SuperAdmin, Roles.Admin, Roles.Viewer) ? null : currentUser.UserId;

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await dashboardService.GetAsync(ReadOwnerScope));
}
