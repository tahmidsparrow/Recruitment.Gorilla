using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace Recruitment.Gorilla.API.Services;

public class CVParserService
{
    // Tolerates whitespace around '@' — some PDFs lay the address out as "name @ domain".
    private static readonly Regex EmailRegex =
        new(@"[\w.+-]+\s*@\s*[\w.-]+\.[a-z]{2,}", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PhoneRegex =
        new(@"(\+?\d[\d\s\-().]{7,}\d)", RegexOptions.Compiled);

    private static readonly Regex LinkedInRegex =
        new(@"linkedin\.com/in/[\w\-]+", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Matches a GitHub profile URL (e.g. github.com/jane-doe), excluding sub-paths beyond the user.
    private static readonly Regex GithubRegex =
        new(@"github\.com/[\w\-]+", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public (string? Name, string? Email, string? Phone, string? LinkedIn, string? Github, string? Skills, string? Summary)
        Parse(string filePath, string fileType)
    {
        var hyperlinks = new List<string>();
        var text = fileType == "PDF"
            ? ExtractPdfText(filePath, hyperlinks)
            : ExtractWordText(filePath);
        return ExtractFields(text, hyperlinks);
    }

    private static string ExtractPdfText(string filePath, List<string> hyperlinks)
    {
        var sb = new StringBuilder();
        using var doc = PdfDocument.Open(filePath);
        foreach (Page page in doc.GetPages())
        {
            sb.AppendLine(page.Text);
            // Resume headers often show "LinkedIn"/"GitHub" as link labels rather than
            // the URL itself; pull the real targets from the page's hyperlink annotations.
            try
            {
                foreach (var link in page.GetHyperlinks())
                    if (!string.IsNullOrWhiteSpace(link.Uri))
                        hyperlinks.Add(link.Uri);
            }
            catch
            {
                // Hyperlink extraction is best-effort; ignore malformed annotations.
            }
        }
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

    private static (string? Name, string? Email, string? Phone, string? LinkedIn, string? Github, string? Skills, string? Summary)
        ExtractFields(string text, List<string> hyperlinks)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var name = ExtractName(lines);

        var emailMatch = EmailRegex.Match(text);
        var email = emailMatch.Success ? emailMatch.Value.Replace(" ", "") : null;

        var phone = PhoneRegex.Match(text).Value.NullIfEmpty();

        // Prefer a URL in the visible text; otherwise fall back to hyperlink targets.
        var linkedin = MatchUrl(text, hyperlinks, LinkedInRegex);
        var github = MatchUrl(text, hyperlinks, GithubRegex);

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

        return (name, email, phone, linkedin, github, skills, summary);
    }

    /// <summary>Finds a URL in the visible text, falling back to the page's hyperlink targets.</summary>
    private static string? MatchUrl(string text, List<string> hyperlinks, Regex regex)
    {
        var match = regex.Match(text);
        if (match.Success) return match.Value;
        return hyperlinks.Select(h => regex.Match(h)).FirstOrDefault(m => m.Success)?.Value;
    }

    /// <summary>
    /// Best-effort name detection from the document header. Handles common resume layouts
    /// where the name is rendered in capitals, possibly jammed onto the same line as the
    /// job title (e.g. "SHAMIM  Backend Engineer" or "ATUL BISWASH Aspiring ML Engineer").
    /// </summary>
    private static string? ExtractName(string[] lines)
    {
        if (lines.Length == 0) return null;
        var first = lines[0];

        // 1) Leading run of ALL-CAPS alphabetic words (the most common name styling).
        var tokens = first.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var caps = tokens
            .TakeWhile(t => t.Length >= 2 && t.All(char.IsLetter) && t == t.ToUpperInvariant())
            .ToList();
        if (caps.Count is >= 1 and <= 4)
        {
            var capName = string.Join(' ', caps);
            if (capName.Length <= 40) return capName;
        }

        // 2) Header where the name is separated from the title by a wide (2+ space) gap.
        var chunk = Regex.Split(first, @"\s{2,}").FirstOrDefault(s => !string.IsNullOrWhiteSpace(s))?.Trim();
        if (chunk is not null && chunk.Length is > 2 and <= 40 && !chunk.Contains('@') && !chunk.Any(char.IsDigit))
            return chunk;

        // 3) Fallback: the first short, clean line with no email/digits.
        return lines.FirstOrDefault(l => l.Length is > 2 and <= 40 && !l.Contains('@') && !l.Any(char.IsDigit));
    }

    private static bool IsHeading(string line) =>
        line.Length < 50 && line == line.ToUpper();
}

file static class StringExtensions
{
    public static string? NullIfEmpty(this string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
