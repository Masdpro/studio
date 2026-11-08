/** Sanity checks on the machine definitions themselves, plus "the docs match the code". */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_MACHINES, type Machine } from '@/lib/state-machines';
import { renderStateMachineDocs } from '@/lib/state-machines/docs';

const list = <T>(v: T | readonly T[]) => (Array.isArray(v) ? (v as readonly T[]) : [v as T]);

describe.each(ALL_MACHINES.map((m) => [m.name, m as Machine<string, string, unknown>] as const))('%s machine', (_name, m) => {
  it('nothing leaves a final state', () => {
    for (const s of m.stateNames) if (m.isFinal(s)) expect(m.movesFrom(s)).toEqual([]);
  });
  it('legacy and planned states have no way in', () => {
    for (const t of m.transitions) {
      const info = m.states[t.to];
      expect(info.legacy || info.planned, `${t.event} → ${t.to}`).toBeFalsy();
    }
  });
  it('every live state can be reached from the start', () => {
    const seen = new Set<string>(list(m.initial));
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of m.transitions) {
        if (list(t.from).some((f) => seen.has(f)) && !seen.has(t.to)) {
          seen.add(t.to);
          grew = true;
        }
      }
    }
    for (const s of m.stateNames) {
      const info = m.states[s];
      if (!info.legacy && !info.planned) expect(seen.has(s), s).toBe(true);
    }
  });
  it('refuses moves that are not listed', () => {
    for (const from of m.stateNames) {
      for (const to of m.stateNames) {
        const listed = m.transitions.some((t) => list(t.from).includes(from) && t.to === to);
        expect(m.can(from, to)).toBe(listed);
      }
    }
  });
});

describe('docs/state-machines.md', () => {
  it('is up to date (run `npm run machines:docs` if this fails)', () => {
    expect(fs.readFileSync('docs/state-machines.md', 'utf8')).toBe(renderStateMachineDocs());
  });
});
