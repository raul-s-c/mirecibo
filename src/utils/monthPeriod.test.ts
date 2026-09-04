import { describe, expect, it } from 'vitest';
import { monthLabel, moveMonth } from './monthPeriod';

describe('month period helpers', () => {
  it('navega correctamente entre años', () => {
    expect(moveMonth('2026-01', -1)).toBe('2025-12');
    expect(moveMonth('2026-12', 1)).toBe('2027-01');
  });

  it('muestra un mes legible', () => {
    expect(monthLabel('2026-08').toLocaleLowerCase('es')).toContain('agosto');
  });
});
