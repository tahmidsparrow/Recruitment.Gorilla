using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.Auth;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/users")]
public class UsersController(
    UserService users,
    AuditService audit,
    CurrentUser currentUser,
    ILogger<UsersController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await users.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var result = await users.CreateAsync(dto, currentUser.UserId ?? 0);
        if (result.Error is not null) return BadRequest(new { message = result.Error });

        logger.LogInformation("Super Admin {By} created user {Id} ('{Email}').",
            currentUser.UserId, result.User!.Id, result.User.Email);
        await audit.RecordAsync("User.Created", "User", result.User.Id,
            $"Created user '{result.User.Email}' (#{result.User.Id})");
        return Ok(result.User);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var result = await users.UpdateAsync(id, dto);
        if (result.Error is not null) return BadRequest(new { message = result.Error });

        logger.LogInformation("Super Admin {By} updated user {Id}.", currentUser.UserId, id);
        await audit.RecordAsync("User.Updated", "User", id, $"Updated user #{id}");
        return Ok(result.User);
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
    {
        var result = await users.ResetPasswordAsync(id, dto.TemporaryPassword);
        if (result.Error is not null) return BadRequest(new { message = result.Error });

        logger.LogInformation("Super Admin {By} reset password for user {Id}.", currentUser.UserId, id);
        await audit.RecordAsync("User.PasswordReset", "User", id, $"Reset password for user #{id}");
        return Ok(result.User);
    }
}
