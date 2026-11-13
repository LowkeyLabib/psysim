import { describe, it, expect } from 'vitest';
import { DiagnosisMatcher } from '../src/diagnosis/matcher.js';
import { DiagnosisNormalizer } from '../src/diagnosis/normalizer.js';
import { SEED_SCENARIOS } from '../src/knowledge/seedScenarios.js';

describe('DiagnosisNormalizer', () => {
  it('normalizes abbreviations and unicode', () => {
    expect(DiagnosisNormalizer.normalize('MDD')).toBe('major depressive disorder');
    expect(DiagnosisNormalizer.normalize('bpad 1')).toBe('bipolar i disorder');
    expect(DiagnosisNormalizer.normalize('gad')).toBe('generalized anxiety disorder');
    expect(DiagnosisNormalizer.normalize('OCD')).toBe('obsessive compulsive disorder');
    expect(DiagnosisNormalizer.normalize('  PTSD  ')).toBe('post-traumatic stress disorder');
  });

  it('normalizes Bengali psychiatric terms', () => {
    expect(DiagnosisNormalizer.normalize('মেজর ডিপ্রেসিভ ডিসঅর্ডার')).toBe('major depressive disorder');
    expect(DiagnosisNormalizer.normalize('শুচিবায়ু')).toBe('obsessive compulsive disorder');
    expect(DiagnosisNormalizer.normalize('ম্যানিয়া')).toBe('bipolar i disorder');
  });
});

describe('DiagnosisMatcher', () => {
  const mddScenario = SEED_SCENARIOS.find((s) => s.id === 'scen_mdd_beginner')!;
  const bipolarScenario = SEED_SCENARIOS.find((s) => s.id === 'scen_bipolar_intermediate')!;
  const ocdScenario = SEED_SCENARIOS.find((s) => s.id === 'scen_ocd_intermediate')!;

  it('evaluates exact English match as CORRECT', () => {
    const res = DiagnosisMatcher.evaluate('Major Depressive Disorder', mddScenario);
    expect(res.outcome).toBe('CORRECT');
  });

  it('evaluates abbreviation MDD as CORRECT', () => {
    const res = DiagnosisMatcher.evaluate('MDD', mddScenario);
    expect(res.outcome).toBe('CORRECT');
  });

  it('evaluates Bengali term as CORRECT', () => {
    const res = DiagnosisMatcher.evaluate('মেজর ডিপ্রেসিভ ডিসঅর্ডার', mddScenario);
    expect(res.outcome).toBe('CORRECT');
  });

  it('evaluates broad partial term as PARTIALLY_CORRECT', () => {
    const res = DiagnosisMatcher.evaluate('Depression', mddScenario);
    expect(res.outcome).toBe('PARTIALLY_CORRECT');
  });

  it('evaluates completely unrelated diagnosis as INCORRECT', () => {
    const res = DiagnosisMatcher.evaluate('Schizophrenia', mddScenario);
    expect(res.outcome).toBe('INCORRECT');
  });

  it('evaluates Bipolar Mania acronym and Bengali synonyms', () => {
    const res1 = DiagnosisMatcher.evaluate('BPAD 1', bipolarScenario);
    expect(res1.outcome).toBe('CORRECT');

    const res2 = DiagnosisMatcher.evaluate('ম্যানিয়া', bipolarScenario);
    expect(res2.outcome).toBe('CORRECT');
  });

  it('evaluates OCD with Bengali synonym শুচিবায়ু', () => {
    const res = DiagnosisMatcher.evaluate('শুচিবায়ু', ocdScenario);
    expect(res.outcome).toBe('CORRECT');
  });
});
