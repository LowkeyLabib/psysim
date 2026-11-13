export interface KnowledgeSource {
  id: string;
  sourceName: string;
  url: string;
  licenseTerms: string;
  version: string;
  retrievalDate: string;
  contentType: string;
  diagnosticCategories: string[];
}

export const OFFICIAL_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'src_who_icd11',
    sourceName: 'WHO ICD-11 Classification of Mental and Behavioural Disorders',
    url: 'https://icd.who.int/browse11/l-m/en',
    licenseTerms: 'Creative Commons Attribution-NonCommercial-ShareAlike 3.0 IGO (CC BY-NC-SA 3.0 IGO) for educational use',
    version: '2024-01 Release',
    retrievalDate: '2026-11-13',
    contentType: 'Diagnostic criteria, clinical descriptions, diagnostic guidelines',
    diagnosticCategories: [
      'Depressive disorders',
      'Bipolar or related disorders',
      'Schizophrenia or other primary psychotic disorders',
      'Anxiety or fear-related disorders',
      'Obsessive-compulsive or related disorders',
      'Disorders specifically associated with stress',
      'Disorders due to substance use',
    ],
  },
  {
    id: 'src_nimh',
    sourceName: 'National Institute of Mental Health (NIMH) Health Topics',
    url: 'https://www.nimh.nih.gov/health/topics',
    licenseTerms: 'U.S. Public Domain (U.S. Government Work)',
    version: 'Current Reference',
    retrievalDate: '2026-11-13',
    contentType: 'Evidence-based psychiatric epidemiology, symptom presentation, clinical course',
    diagnosticCategories: [
      'Depressive disorders',
      'Bipolar disorder',
      'Schizophrenia',
      'Anxiety disorders',
      'Obsessive-compulsive disorder',
      'Post-traumatic stress disorder',
      'Substance use disorders',
    ],
  },
  {
    id: 'src_medlineplus',
    sourceName: 'MedlinePlus Medical Encyclopedia (U.S. National Library of Medicine)',
    url: 'https://medlineplus.gov/mentalhealthandbehavior.html',
    licenseTerms: 'U.S. Public Domain / NLM terms of service',
    version: '2024 Edition',
    retrievalDate: '2026-11-13',
    contentType: 'Patient health education, clinical terminology, common synonyms',
    diagnosticCategories: ['All psychiatric disorders'],
  },
];
