// ============================================================================
// workers.ts  -  deterministic worker generator for Session 4.1.
// Given a global index + per-game seed, always produces the same name/role.
// ============================================================================

import type { WorkerState } from '../game/types';

const FIRST_NAMES = [
  'Amara', 'Benito', 'Chiara', 'Dev', 'Esme', 'Femi', 'Gael', 'Hiroshi',
  'Ines', 'Jun', 'Kira', 'Leo', 'Mia', 'Nadia', 'Omar', 'Priya', 'Quinn',
  'Rafael', 'Sana', 'Theo', 'Uma', 'Vera', 'Wei', 'Xio', 'Yara', 'Zane',
  'Aria', 'Blake', 'Carmen', 'Dion', 'Emi', 'Franko', 'Grace', 'Hana',
  'Ivan', 'Jade', 'Kai', 'Luna', 'Marco', 'Nova',
];

const LAST_NAMES = [
  'Adeyemi', 'Bauer', 'Chen', 'Diallo', 'Eames', 'Ferreira', 'Guo', 'Hassan',
  'Ibarra', 'Johansson', 'Kim', 'Levi', 'Mori', 'Nkosi', 'Okonkwo', 'Park',
  'Reyes', 'Singh', 'Tanaka', 'Ueda', 'Vasquez', 'Wong', 'Xu', 'Yamamoto',
  'Ababio', 'Beckett', 'Costa', 'Dubois', 'Esposito', 'Flores', 'García',
  'Huang', 'Ismail', 'Jović', 'Kowalski', 'Lim', 'Martín', 'Nduka', 'Osei',
];

const ROLES = [
  'Associate', 'Coordinator', 'Analyst', 'Specialist', 'Lead',
  'Engineer', 'Manager', 'Strategist', 'Consultant', 'Director',
];

function pick<T>(arr: T[], n: number): T {
  return arr[((n % arr.length) + arr.length) % arr.length];
}

/**
 * Produce a named worker from a stable (idx, gameSeed) pair.
 * Different games with different seeds get different rosters.
 */
export function generateWorker(idx: number, gameSeed: number, now: number): WorkerState {
  // Mix index and seed with coprime multipliers to avoid aliasing.
  const si = (gameSeed + idx * 37) | 0;
  return {
    id: `worker-${idx}`,
    name: `${pick(FIRST_NAMES, si * 7 + 3)} ${pick(LAST_NAMES, si * 13 + 11)}`,
    role: pick(ROLES, si * 5 + 1),
    morale: 62, // start moderately engaged
    hiredAt: now,
    lastEventAt: now,
  };
}
