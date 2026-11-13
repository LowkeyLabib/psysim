import { Message, Objective, InternalClinicalProfile, InterviewProgress } from '../types/index.js';

export class InterviewEvaluator {
  static evaluateProgress(
    transcript: Message[],
    scenario: InternalClinicalProfile,
    currentObjectives: Objective[]
  ): InterviewProgress {
    const updated = currentObjectives.map((o) => ({ ...o, evidenceMessageIds: [...o.evidenceMessageIds] }));
    const studentMessages = transcript.filter((m) => m.role === 'student');

    for (const obj of updated) {
      if (obj.completed) continue;

      const def = scenario.mandatoryObjectives.find((o) => o.id === obj.id);
      if (!def) continue;

      const allKeywords = [...(def.keywordsEn || []), ...(def.keywordsBn || [])].map((k) => k.toLowerCase());

      for (const msg of studentMessages) {
        const text = msg.content.toLowerCase();
        const matched = allKeywords.some((kw) => text.includes(kw));

        if (matched) {
          obj.completed = true;
          obj.confidence = 0.92;
          if (!obj.evidenceMessageIds.includes(msg.id)) {
            obj.evidenceMessageIds.push(msg.id);
          }
          break;
        }
      }
    }

    const eligible = updated.filter((o) => o.required).every((o) => o.completed);

    return {
      eligible,
      objectives: updated,
    };
  }
}
