import { describe, expect, it } from 'vitest';
import { parseGradeLabel, stripTags } from './grade-parse';

describe('parseGradeLabel', () => {
  it('parses graded labels into company + numeric grade', () => {
    expect(parseGradeLabel('PSA 10')).toEqual({
      variant: 'graded',
      gradeCompany: 'PSA',
      gradeValue: '10',
    });
    expect(parseGradeLabel('BRG 8.5 영문')).toEqual({
      variant: 'graded',
      gradeCompany: 'BRG',
      gradeValue: '8.5',
    });
  });

  it('finds the grade inside a longer listing title', () => {
    expect(parseGradeLabel('Charizard EX 104/100 Korean PSA 8')).toEqual({
      variant: 'graded',
      gradeCompany: 'PSA',
      gradeValue: '8',
    });
  });

  it('marks a graded label with no numeric value as graded with null value', () => {
    expect(parseGradeLabel('CGC graded')).toEqual({
      variant: 'graded',
      gradeCompany: 'CGC',
      gradeValue: null,
    });
  });

  it('treats unknown/ungraded labels as raw', () => {
    expect(parseGradeLabel('미감정')).toEqual({
      variant: 'raw',
      gradeCompany: null,
      gradeValue: null,
    });
    expect(parseGradeLabel(undefined)).toEqual({
      variant: 'raw',
      gradeCompany: null,
      gradeValue: null,
    });
    expect(parseGradeLabel(null)).toEqual({
      variant: 'raw',
      gradeCompany: null,
      gradeValue: null,
    });
  });
});

describe('stripTags', () => {
  it('removes HTML tags and trims', () => {
    expect(stripTags('포켓몬 <b>리자몽</b> ex SAR')).toBe('포켓몬 리자몽 ex SAR');
    expect(stripTags(undefined)).toBe('');
  });
});
