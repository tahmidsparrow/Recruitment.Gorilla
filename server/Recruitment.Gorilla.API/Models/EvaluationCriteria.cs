namespace Recruitment.Gorilla.API.Models;

/// <summary>
/// The fixed catalog of evaluation criteria (from the Interview Evaluation Form).
/// Keys must match the frontend catalog in client/src/utils/evaluationCriteria.ts.
/// </summary>
public static class EvaluationCriteria
{
    public static readonly IReadOnlySet<string> Keys = new HashSet<string>
    {
        // A. Educational & Professional Background
        "RelevanceOfExperience",
        "JobStabilityProgression",
        "EducationalBackground",
        // B. Technical Skills & Job Knowledge
        "CoreTechnicalCompetency",
        "ToolsSoftwareProficiency",
        "ProblemSolvingSkills",
        // C. Soft Skills & Communication
        "CommunicationClarity",
        "ListeningSkills",
        "AdaptabilityFlexibility",
        // D. Cultural Fit & Motivation
        "AlignmentWithCompanyValues",
        "MotivationEnthusiasm",
        "TeamDynamics",
    };

    public static readonly IReadOnlySet<string> Recommendations = new HashSet<string>
    {
        "Recommended", "Hold", "Reject", "Other",
    };
}
