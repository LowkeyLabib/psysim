import { CORE_OBJECTIVES } from '../knowledge/seedScenarios.js';

export interface InterviewObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  keywordsEn?: string[];
  keywordsBn?: string[];
}

export const CORE_INTERVIEW_OBJECTIVES: InterviewObjectiveDefinition[] = CORE_OBJECTIVES.map((o) => ({
  id: o.id,
  title: o.title,
  description: o.guidance,
  isMandatory: o.required,
  keywordsEn: o.keywordsEn,
  keywordsBn: o.keywordsBn,
}));
