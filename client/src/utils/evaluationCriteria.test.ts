import { describe, it, expect } from 'vitest';
import {
  ALL_CRITERION_KEYS,
  EVALUATION_SECTIONS,
  RECOMMENDATIONS,
  RATING_SCALE,
} from './evaluationCriteria';

// Mirrors server/.../Models/EvaluationCriteria.cs — these MUST stay in sync, so the test pins them.
const EXPECTED_KEYS = [
  'RelevanceOfExperience', 'JobStabilityProgression', 'EducationalBackground',
  'CoreTechnicalCompetency', 'ToolsSoftwareProficiency', 'ProblemSolvingSkills',
  'CommunicationClarity', 'ListeningSkills', 'AdaptabilityFlexibility',
  'AlignmentWithCompanyValues', 'MotivationEnthusiasm', 'TeamDynamics',
];

describe('evaluationCriteria', () => {
  it('has exactly the 12 backend criterion keys', () => {
    expect(ALL_CRITERION_KEYS).toHaveLength(12);
    expect([...ALL_CRITERION_KEYS].sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('has 4 sections of 3 criteria that flatten to ALL_CRITERION_KEYS', () => {
    expect(EVALUATION_SECTIONS).toHaveLength(4);
    for (const section of EVALUATION_SECTIONS) {
      expect(section.criteria).toHaveLength(3);
    }
    const flattened = EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => c.key));
    expect(flattened).toEqual(ALL_CRITERION_KEYS);
  });

  it('offers the four recommendation options', () => {
    expect(RECOMMENDATIONS.map((r) => r.value)).toEqual(['Recommended', 'Hold', 'Reject', 'Other']);
  });

  it('rates 1 through 5', () => {
    expect(RATING_SCALE.map((r) => r.value)).toEqual([1, 2, 3, 4, 5]);
  });
});
