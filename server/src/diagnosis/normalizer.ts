export class DiagnosisNormalizer {
  private static abbreviationMap: Record<string, string> = {
    mdd: 'major depressive disorder',
    bpad: 'bipolar affective disorder',
    'bpad 1': 'bipolar i disorder',
    'bpad i': 'bipolar i disorder',
    'bpad 2': 'bipolar ii disorder',
    'bpad ii': 'bipolar ii disorder',
    gad: 'generalized anxiety disorder',
    ocd: 'obsessive compulsive disorder',
    ptsd: 'post-traumatic stress disorder',
    aud: 'alcohol use disorder',
    sud: 'substance use disorder',
    schizo: 'schizophrenia',
  };

  private static bengaliSynonymMap: Record<string, string> = {
    'মেজর ডিপ্রেসিভ ডিসঅর্ডার': 'major depressive disorder',
    'মেজর ডিপ্রেসিভ ডিজঅর্ডার': 'major depressive disorder',
    'বিষণ্নতা': 'major depressive disorder',
    'ডিপ্রেশন': 'major depressive disorder',
    'বাইপোলার ডিজঅর্ডার': 'bipolar affective disorder',
    'বাইপোলার ডিসঅর্ডার': 'bipolar affective disorder',
    'ম্যানিয়া': 'bipolar i disorder',
    'শুচিবায়ু': 'obsessive compulsive disorder',
    'ওসিডি': 'obsessive compulsive disorder',
    'উদ্বেগ ব্যাধি': 'generalized anxiety disorder',
    'অতিরিক্ত দুশ্চিন্তা': 'generalized anxiety disorder',
    'সিজোফ্রেনিয়া': 'schizophrenia',
    'সিজোফ্রেনিয়া': 'schizophrenia',
    'পিটিএসডি': 'post-traumatic stress disorder',
    'অ্যালকোহল আসক্তি': 'alcohol use disorder',
  };

  static normalize(text: string): string {
    if (!text) return '';

    // Unicode normalization (NFC)
    let cleaned = text.normalize('NFC').trim().toLowerCase();

    // Remove surrounding punctuation
    cleaned = cleaned.replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Check abbreviation
    if (this.abbreviationMap[cleaned]) {
      return this.abbreviationMap[cleaned];
    }

    // Check Bengali mapping
    if (this.bengaliSynonymMap[cleaned]) {
      return this.bengaliSynonymMap[cleaned];
    }

    // Replace hyphens with spaces for standard matching
    cleaned = cleaned.replace(/-/g, ' ');

    return cleaned;
  }
}
