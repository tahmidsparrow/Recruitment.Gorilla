using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(
    NotificationService notifications,
    CurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        if (currentUser.UserId is not int userId) return Unauthorized();
        return Ok(await notifications.GetMineAsync(userId));
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        if (currentUser.UserId is not int userId) return Unauthorized();
        var ok = await notifications.MarkReadAsync(id, userId);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        if (currentUser.UserId is not int userId) return Unauthorized();
        await notifications.MarkAllReadAsync(userId);
        return NoContent();
    }
}
