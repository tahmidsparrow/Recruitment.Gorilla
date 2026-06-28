using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace Recruitment.Gorilla.API.Services;

public class CVParserService
{
    private static readonly Regex EmailRegex =
        new(@"[\w.+-]+@[\w-]+\.[a-z]{2,}", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PhoneRegex =
        new(@"(\+?\d[\d\s\-().]{7,}\d)", RegexOptions.Compiled);

    private static readonly Regex LinkedInRegex =
        new(@"linkedin\.com/in/[\w\-]+", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public (string? Name, string? Email, string? Phone, string? LinkedIn, string? Skills, string? Summary)
        Parse(string filePath, string fileType)
    {
        var text = fileType == "PDF" ? ExtractPdfText(filePath) : ExtractWordText(filePath);
        return ExtractFields(text);
    }

    private static string ExtractPdfText(string filePath)
    {
        var sb = new StringBuilder();
        using var doc = PdfDocument.Open(filePath);
        foreach (Page page in doc.GetPages())
            sb.AppendLine(page.Text);
        return sb.ToString();
    }

    private static string ExtractWordText(string filePath)
    {
        var sb = new StringBuilder();
        using var doc = WordprocessingDocument.Open(filePath, false);
        var body = doc.MainDocumentPart?.Document?.Body;
        if (body is null) return string.Empty;
        foreach (var para in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Paragraph>())
            sb.AppendLine(para.InnerText);
        return sb.ToString();
    }

    private static (string? Name, string? Email, string? Phone, string? LinkedIn, string? Skills, string? Summary)
        ExtractFields(string text)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var name = lines.FirstOrDefault(l => l.Length > 2 && l.Length < 60 && !l.Contains('@'));
        var email = EmailRegex.Match(text).Value.NullIfEmpty();
        var phone = PhoneRegex.Match(text).Value.NullIfEmpty();
        var linkedin = LinkedInRegex.Match(text).Value.NullIfEmpty();

        string? skills = null;
        string? summary = null;

        for (int i = 0; i < lines.Length; i++)
        {
            var lower = lines[i].ToLower();
            if (skills is null && (lower.Contains("skills") || lower.Contains("technologies")))
            {
                var block = new StringBuilder();
                for (int j = i + 1; j < Math.Min(i + 8, lines.Length); j++)
                {
                    if (IsHeading(lines[j])) break;
                    block.AppendLine(lines[j]);
                }
                skills = block.ToString().Trim().NullIfEmpty();
            }

            if (summary is null && (lower.Contains("summary") || lower.Contains("profile") || lower.Contains("objective")))
            {
                var block = new StringBuilder();
                for (int j = i + 1; j < Math.Min(i + 6, lines.Length); j++)
                {
                    if (IsHeading(lines[j])) break;
                    block.AppendLine(lines[j]);
                }
                summary = block.ToString().Trim().NullIfEmpty();
            }
        }

        return (name, email, phone, linkedin, skills, summary);
    }

    private static bool IsHeading(string line) =>
        line.Length < 50 && line == line.ToUpper();
}

file static class StringExtensions
{
    public static string? NullIfEmpty(this string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
