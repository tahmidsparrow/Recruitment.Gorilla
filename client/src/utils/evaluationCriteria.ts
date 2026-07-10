// Fixed catalog for the Interview Evaluation Form. Keys MUST match the backend
// catalog in server/.../Models/EvaluationCriteria.cs.

export interface Criterion {
  key: string;
  label: string;
  hint: string;
}

export interface CriteriaSection {
  id: string;
  title: string;
  description: string;
  criteria: Criterion[];
}

export const EVALUATION_SECTIONS: CriteriaSection[] = [
  {
    id: 'A',
    title: 'A. Educational & Professional Background',
    description: 'Relevance of education and past work experience to the specific role.',
    criteria: [
      { key: 'RelevanceOfExperience', label: 'Relevance of Experience', hint: 'Does work history align with the JD?' },
      { key: 'JobStabilityProgression', label: 'Job Stability & Progression', hint: 'History of growth and tenure' },
      { key: 'EducationalBackground', label: 'Educational Background', hint: 'Degrees, certifications, training' },
    ],
  },
  {
    id: 'B',
    title: 'B. Technical Skills & Job Knowledge',
    description: 'Specific technical abilities required for the position.',
    criteria: [
      { key: 'CoreTechnicalCompetency', label: 'Core Technical Competency', hint: 'Subject matter expertise' },
      { key: 'ToolsSoftwareProficiency', label: 'Tools & Software Proficiency', hint: 'Familiarity with the necessary stack' },
      { key: 'ProblemSolvingSkills', label: 'Problem-Solving Skills', hint: 'Ability to troubleshoot and find solutions' },
    ],
  },
  {
    id: 'C',
    title: 'C. Soft Skills & Communication',
    description: 'Interpersonal skills and the ability to work within the team.',
    criteria: [
      { key: 'CommunicationClarity', label: 'Communication Clarity', hint: 'Verbal and written articulation' },
      { key: 'ListeningSkills', label: 'Listening Skills', hint: 'Understands questions, attentive' },
      { key: 'AdaptabilityFlexibility', label: 'Adaptability & Flexibility', hint: 'Handling change or ambiguity' },
    ],
  },
  {
    id: 'D',
    title: 'D. Cultural Fit & Motivation',
    description: 'Alignment with company values and motivation for the role.',
    criteria: [
      { key: 'AlignmentWithCompanyValues', label: 'Alignment with Company Values', hint: '' },
      { key: 'MotivationEnthusiasm', label: 'Motivation & Enthusiasm', hint: 'Interest in the role/company' },
      { key: 'TeamDynamics', label: 'Team Dynamics', hint: 'Collaborative vs. independent style' },
    ],
  },
];

export const ALL_CRITERION_KEYS = EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => c.key));

export const RECOMMENDATIONS: { value: string; label: string; hint: string }[] = [
  { value: 'Recommended', label: 'Recommended', hint: 'Meets requirements; good fit.' },
  { value: 'Hold', label: 'Hold', hint: 'Potential fit, but have reservations or other candidates to review.' },
  { value: 'Reject', label: 'Reject', hint: 'Does not meet requirements.' },
  { value: 'Other', label: 'Other', hint: 'Specify below.' },
];

export const RATING_SCALE: { value: number; label: string }[] = [
  { value: 1, label: '1 — Unsatisfactory' },
  { value: 2, label: '2 — Below Expectations' },
  { value: 3, label: '3 — Meets Expectations' },
  { value: 4, label: '4 — Exceeds Expectations' },
  { value: 5, label: '5 — Outstanding' },
];
