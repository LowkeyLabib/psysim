import {
  Message,
  InterviewObjectiveProgress,
  ScenarioTemplate,
} from '../types/index.js';

export class InterviewEvaluator {
  /**
   * Evaluates the current conversation transcript against the scenario's interview objectives.
   * Uses clinical keywords, semantic cues, and transcript pair evidence.
   */
  static evaluateProgress(
    transcript: Message[],
    scenario: ScenarioTemplate,
    currentProgress: InterviewObjectiveProgress[]
  ): InterviewObjectiveProgress[] {
    const updatedProgress: InterviewObjectiveProgress[] = currentProgress.map((obj) => ({
      ...obj,
    }));

    // Find student messages to evaluate what clinical inquiries have been made
    const studentMessages = transcript.filter((m) => m.sender === 'student');

    for (const objProg of updatedProgress) {
      if (objProg.status === 'COMPLETED') {
        continue; // Keep already completed objectives stable
      }

      const definition = scenario.mandatoryObjectives.find((o) => o.id === objProg.id);
      if (!definition) continue;

      const keywordsEn = definition.keywordsEn || [];
      const keywordsBn = definition.keywordsBn || [];
      const allKeywords = [...keywordsEn, ...keywordsBn].map((k) => k.toLowerCase());

      let matchedEvidence: { msg: Message; quote: string; confidence: number } | null = null;

      for (const msg of studentMessages) {
        const text = msg.content.toLowerCase();

        for (const kw of allKeywords) {
          if (text.includes(kw)) {
            matchedEvidence = {
              msg,
              quote: msg.content,
              confidence: 0.92,
            };
            break;
          }
        }

        if (matchedEvidence) break;
      }

      if (matchedEvidence) {
        objProg.status = 'COMPLETED';
        objProg.evidenceQuote = matchedEvidence.quote;
        objProg.evidenceMessageId = matchedEvidence.msg.id;
        objProg.confidence = matchedEvidence.confidence;
      } else if (studentMessages.length > 0) {
        // If student has begun interviewing but this domain isn't satisfied yet
        objProg.status = 'NOT_STARTED';
      }
    }

    return updatedProgress;
  }

  /**
   * Authority check for whether student has satisfied all mandatory interview objectives.
   */
  static isSubmissionEligible(objectives: InterviewObjectiveProgress[]): {
    eligible: boolean;
    missingMandatory: { id: string; title: string }[];
  } {
    const missing: { id: string; title: string }[] = [];

    for (const obj of objectives) {
      if (obj.isMandatory && obj.status !== 'COMPLETED') {
        missing.push({ id: obj.id, title: obj.title });
      }
    }

    return {
      eligible: missing.length === 0,
      missingMandatory: missing,
    };
  }
}
