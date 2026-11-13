import { DiagnosticOutcome, ScenarioTemplate } from '../types/index.js';
import { DiagnosisNormalizer } from './normalizer.js';

export interface DiagnosisMatchResult {
  outcome: DiagnosticOutcome;
  matchedDiagnosisName?: string;
  explanation: string;
}

export class DiagnosisMatcher {
  static evaluate(
    submittedDiagnosis: string,
    scenario: ScenarioTemplate
  ): DiagnosisMatchResult {
    const rawNormalized = DiagnosisNormalizer.normalize(submittedDiagnosis);
    const approvedNormalized = DiagnosisNormalizer.normalize(scenario.approvedDiagnosis.name);

    if (!rawNormalized) {
      return {
        outcome: 'INCORRECT',
        explanation: 'No diagnosis text was submitted.',
      };
    }

    // 1. Direct match with approved diagnosis name
    if (rawNormalized === approvedNormalized) {
      return {
        outcome: 'CORRECT',
        matchedDiagnosisName: scenario.approvedDiagnosis.name,
        explanation: `Accurately identified ${scenario.approvedDiagnosis.name}, matching clinical ground truth.`,
      };
    }

    // 2. Check accepted diagnoses list (Exact and Partial)
    for (const accepted of scenario.acceptedDiagnoses) {
      const acceptedNorm = DiagnosisNormalizer.normalize(accepted.name);
      if (rawNormalized === acceptedNorm) {
        if (accepted.isExact) {
          return {
            outcome: 'CORRECT',
            matchedDiagnosisName: accepted.name,
            explanation: `Accurately identified approved clinical diagnosis (${accepted.name}).`,
          };
        }
        if (accepted.isPartial) {
          return {
            outcome: 'PARTIALLY_CORRECT',
            matchedDiagnosisName: accepted.name,
            explanation: `Identified broad clinical category (${accepted.name}), but omitted specific required episode or diagnostic specifier.`,
          };
        }
      }

      // Check synonyms
      for (const syn of accepted.synonyms) {
        const synNorm = DiagnosisNormalizer.normalize(syn);
        if (rawNormalized === synNorm) {
          if (accepted.isExact) {
            return {
              outcome: 'CORRECT',
              matchedDiagnosisName: accepted.name,
              explanation: `Accepted synonym matches approved diagnosis (${accepted.name}).`,
            };
          }
          return {
            outcome: 'PARTIALLY_CORRECT',
            matchedDiagnosisName: accepted.name,
            explanation: `Partially matches approved diagnostic category (${accepted.name}).`,
          };
        }
      }
    }

    // 3. Substring / Specifier Partial Matches
    // e.g. "bipolar" for "bipolar i disorder" or "depression" for "major depressive disorder"
    const categoryNorm = DiagnosisNormalizer.normalize(scenario.categoryName);
    if (
      rawNormalized.includes('bipolar') && approvedNormalized.includes('bipolar') ||
      rawNormalized.includes('depress') && approvedNormalized.includes('depress') ||
      rawNormalized.includes('psychosis') && approvedNormalized.includes('schizophren') ||
      rawNormalized.includes('anxiety') && approvedNormalized.includes('anxiety') ||
      rawNormalized.includes(categoryNorm)
    ) {
      return {
        outcome: 'PARTIALLY_CORRECT',
        matchedDiagnosisName: scenario.categoryName,
        explanation: `Identified the correct diagnostic category (${scenario.categoryName}), but did not specify the exact clinical disorder or specifier.`,
      };
    }

    // 4. If submission contains medical reasoning that might be defensible but isn't clear
    if (rawNormalized.length > 50 && (rawNormalized.includes('disorder') || rawNormalized.includes('syndrome'))) {
      return {
        outcome: 'REVIEW_REQUIRED',
        explanation: 'Complex clinical impression submitted requiring supervisor review.',
      };
    }

    // 5. Default: Incorrect
    return {
      outcome: 'INCORRECT',
      explanation: `The submitted diagnosis "${submittedDiagnosis}" does not align with the patient's presentation or approved diagnostic criteria for this case.`,
    };
  }
}
