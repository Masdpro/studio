/**
 * A tiny, dependency-free way to write a state machine down as data.
 *
 * Each machine lists its states (with a plain-language meaning) and every allowed move between them:
 * who may make it (`by`), what triggers it (`event`) and any rule that must hold (`guard`).
 * Code asks the machine before changing a status, the UI asks it which buttons to show, and
 * `npm run machines:docs` turns the same data into docs/state-machines.md, so the rules,
 * the screens and the docs can't drift apart.
 */

export type StateInfo = {
  /** What this status means, in plain words. */
  meaning: string;
  /** Nothing can happen after this status. */
  final?: boolean;
  /** Kept only so older records still read correctly; nothing moves into it any more. */
  legacy?: boolean;
  /** Reserved for a feature that isn't built yet; nothing moves into it today. */
  planned?: boolean;
};

export type Guard<C> = {
  /** Short name shown in docs and error codes, e.g. "matches delivery preference". */
  name: string;
  /** Returns null when the move is allowed, or the message to show when it isn't. */
  check: (ctx: C) => string | null;
};

export type Transition<S extends string, A extends string, C> = {
  from: S | readonly S[];
  to: S;
  /** What makes it happen, e.g. "vendor accepts the order". */
  event: string;
  /** Who may make this move. Omit for moves the system makes on its own (webhooks, timers). */
  by?: readonly A[];
  guards?: readonly Guard<C>[];
  /** Rules checked outside the machine because they need the database or the outside world. */
  checkedElsewhere?: readonly string[];
};

export type MachineDefinition<S extends string, A extends string, C> = {
  name: string;
  description: string;
  /** Where the status is stored, e.g. "orders.status". */
  storedIn: string;
  initial: S | readonly S[];
  states: Record<S, StateInfo>;
  transitions: readonly Transition<S, A, C>[];
};

export type CheckResult = { ok: true } | { ok: false; reason: 'not-allowed' | 'guard'; message: string };

export type Machine<S extends string, A extends string, C> = MachineDefinition<S, A, C> & {
  /** Every state name. */
  stateNames: readonly S[];
  isState(value: unknown): value is S;
  isFinal(state: S): boolean;
  /** The transitions that leave `from` (optionally only those `actor` may make). */
  movesFrom(from: S, actor?: A): Transition<S, A, C>[];
  /** Where `actor` can take something that is currently `from`. */
  targets(from: S, actor?: A): S[];
  /** True if the move exists (and, when given, `actor` may make it). Ignores guards. */
  can(from: S, to: S, actor?: A): boolean;
  /** Like `can`, plus guards; returns a message suitable for the user when refused. */
  check(from: S, to: S, actor: A | undefined, ctx: C): CheckResult;
};

const asList = <T>(v: T | readonly T[]): readonly T[] => (Array.isArray(v) ? (v as readonly T[]) : [v as T]);

export function defineMachine<S extends string, A extends string = never, C = undefined>(def: MachineDefinition<S, A, C>): Machine<S, A, C> {
  const stateNames = Object.keys(def.states) as S[];
  for (const t of def.transitions) {
    for (const s of [...asList(t.from), t.to]) {
      if (!(s in def.states)) throw new Error(`${def.name}: transition "${t.event}" uses unknown state "${s}"`);
    }
  }
  const movesFrom = (from: S, actor?: A) =>
    def.transitions.filter((t) => asList(t.from).includes(from) && (actor === undefined || !t.by || t.by.includes(actor)));
  const find = (from: S, to: S, actor?: A) => movesFrom(from, actor).filter((t) => t.to === to);

  return {
    ...def,
    stateNames,
    isState: (value: unknown): value is S => typeof value === 'string' && value in def.states,
    isFinal: (state) => !!def.states[state]?.final,
    movesFrom,
    targets: (from, actor) => Array.from(new Set(movesFrom(from, actor).map((t) => t.to))),
    can: (from, to, actor) => find(from, to, actor).length > 0,
    check(from, to, actor, ctx) {
      const options = find(from, to, actor);
      if (!options.length) return { ok: false, reason: 'not-allowed', message: `This can't be moved from "${from}" to "${to}".` };
      let firstFailure: string | null = null;
      for (const t of options) {
        const failure = (t.guards ?? []).map((g) => g.check(ctx)).find((m) => m !== null) ?? null;
        if (failure === null) return { ok: true };
        firstFailure ??= failure;
      }
      return { ok: false, reason: 'guard', message: firstFailure! };
    },
  };
}

/** A Mermaid state diagram for a machine (used by scripts/state-machine-docs.ts). */
export function toMermaid(m: Machine<string, string, unknown>): string {
  const id = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');
  const lines = ['stateDiagram-v2'];
  for (const s of m.stateNames) {
    const info = m.states[s];
    if (id(s) !== s) lines.push(`  state "${s}" as ${id(s)}`);
    if (info.legacy || info.planned) lines.push(`  note right of ${id(s)} : ${info.legacy ? 'legacy' : 'planned'}`);
  }
  for (const s of asList(m.initial)) lines.push(`  [*] --> ${id(s)}`);
  for (const t of m.transitions) {
    for (const from of asList(t.from)) lines.push(`  ${id(from)} --> ${id(t.to)} : ${t.event}${t.by ? ` (${t.by.join(', ')})` : ''}`);
  }
  for (const s of m.stateNames) if (m.states[s].final) lines.push(`  ${id(s)} --> [*]`);
  return lines.join('\n');
}
