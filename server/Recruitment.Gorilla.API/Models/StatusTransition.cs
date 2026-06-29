namespace Recruitment.Gorilla.API.Models;

public class StatusTransition
{
    public int Id { get; set; }
    public int FromStatusOptionId { get; set; }
    public int ToStatusOptionId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public StatusOption FromStatusOption { get; set; } = null!;
    public StatusOption ToStatusOption { get; set; } = null!;
}
