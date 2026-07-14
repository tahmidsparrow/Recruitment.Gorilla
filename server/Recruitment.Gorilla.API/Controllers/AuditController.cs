using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize(Roles = Roles.AdminOrAbove)]
[Route("api/audit")]
public class AuditController(AuditService audit) : ControllerBase
{
    /// <summary>Query the audit trail (newest first), filtered + paginated. Admin+ only.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int? actorUserId,
        [FromQuery] string? entityType,
        [FromQuery] int? entityId,
        [FromQuery] string? action,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 200);
        return Ok(await audit.QueryAsync(actorUserId, entityType, entityId, action, from, to, page, pageSize));
    }
}
