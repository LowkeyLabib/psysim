import { Outcome, InternalClinicalProfile } from '../types/index.js';
import { DiagnosisNormalizer } from './normalizer.js';

export interface DiagnosisMatchResult {
  outcome: Outcome;
  matchedDiagnosisName?: string;
  explanation: string;
}

export class DiagnosisMatcher {
  static evaluate(
    submittedDiagnosis: string,
    scenario: InternalClinicalProfile
  ): DiagnosisMatchResult {
    const rawNormalized = DiagnosisNormalizer.normalize(submittedDiagnosis);
    const approvedNormalized = DiagnosisNormalizer.normalize(scenario.approvedDiagnosis.name);

    if (!rawNormalized) {
      return {
        outcome: 'INCORRECT',
        explanation: 'No diagnosis text was submitted.',
      };
    }

    // 1. Direct match with approved ground truth diagnosis
    if (rawNormalized === approvedNormalized) {
      return {
        outcome: 'CORRECT',
        matchedDiagnosisName: scenario.approvedDiagnosis.name,
        explanation: `Accurately identified approved ground-truth condition (${scenario.approvedDiagnosis.name}).`,
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
            explanation: `Accurately identified approved clinical condition (${accepted.name}).`,
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
              explanation: `Accepted clinical synonym matches approved diagnosis (${accepted.name}).`,
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
    const categoryNorm = DiagnosisNormalizer.normalize(scenario.categoryName);
    if (
      (rawNormalized.includes('bipolar') && approvedNormalized.includes('bipolar')) ||
      (rawNormalized.includes('depress') && approvedNormalized.includes('depress')) ||
      (rawNormalized.includes('psychosis') && approvedNormalized.includes('schizophren')) ||
      (rawNormalized.includes('anxiety') && approvedNormalized.includes('anxiety')) ||
      rawNormalized.includes(categoryNorm)
    ) {
      return {
        outcome: 'PARTIALLY_CORRECT',
        matchedDiagnosisName: scenario.categoryName,
        explanation: `Identified the correct diagnostic category (${scenario.categoryName}), but missed required disorder specifiers.`,
      };
    }

    // 4. Complex medical formulations requiring review
    if (rawNormalized.length > 50 && (rawNormalized.includes('disorder') || rawNormalized.includes('syndrome'))) {
      return {
        outcome: 'REVIEW_REQUIRED',
        explanation: 'Complex clinical impression submitted requiring supervisor review.',
      };
    }

    // 5. Default: Incorrect
    return {
      outcome: 'INCORRECT',
      explanation: `The submitted diagnosis "${submittedDiagnosis}" does not align with the patient’s clinical presentation or approved criteria.`,
    };
  }
}
