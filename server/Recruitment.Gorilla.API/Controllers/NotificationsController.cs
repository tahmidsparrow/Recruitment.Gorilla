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
    public async Task<IActionResult> GetMine() =>
        Ok(await notifications.GetMineAsync(currentUser.UserId));

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var ok = await notifications.MarkReadAsync(id, currentUser.UserId);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await notifications.MarkAllReadAsync(currentUser.UserId);
        return NoContent();
    }
}
