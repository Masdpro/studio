const KEY = 'closebuy-branch-choice';

/** Which branch the customer has chosen to collect from, per vendor ('main' or a branch id). */
export function getBranchChoice(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function setBranchChoice(vendorId: string, branchId: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getBranchChoice(), [vendorId]: branchId }));
  } catch {
    /* storage unavailable: the cart falls back to the main branch */
  }
}
