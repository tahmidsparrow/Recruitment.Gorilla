using Microsoft.AspNetCore.Mvc;
using Recruitment.Gorilla.API.DTOs;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.API.Controllers;

[ApiController]
[Route("api/cvupload")]
public class CVUploadController(CVParserService parser, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".pdf", ".docx"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    [HttpPost]
    public IActionResult Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest("Only PDF and Word (.docx) files are accepted.");

        if (file.Length > MaxFileSizeBytes)
            return BadRequest("File exceeds the 10 MB size limit.");

        var fileType = ext == ".pdf" ? "PDF" : "Word";
        var storedName = $"{Guid.NewGuid()}{ext}";
        var uploadsPath = Path.Combine(env.ContentRootPath, "Uploads");
        Directory.CreateDirectory(uploadsPath);
        var fullPath = Path.Combine(uploadsPath, storedName);

        using (var stream = System.IO.File.Create(fullPath))
            file.CopyTo(stream);

        var (name, email, phone, linkedin, skills, summary) = parser.Parse(fullPath, fileType);

        return Ok(new CVDraftDto(
            name, email, phone, null, skills, summary, linkedin,
            file.FileName, storedName, fileType, file.Length));
    }
}
