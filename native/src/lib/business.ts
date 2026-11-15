import { useGet } from './query';

type RoleState = { role: string; approvalStatus: string; approvalNote: string | null; mayTrade: boolean };

/** Verification status for one of the person's business roles. */
export function useRoleApproval(role: 'vendor' | 'provider' | 'delivery_agent') {
  const q = useGet<{ state: { tradingRoles: RoleState[] } }>(['verification'], '/api/account/verification');
  return q.data?.state.tradingRoles.find((r) => r.role === role);
}
