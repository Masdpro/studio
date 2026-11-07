import type { useRouter } from 'next/navigation';

/** After sign-up, send the user to the "check your email" page to enter their code (carrying the dev-only code, if any). */
export function goToCheckEmail(router: ReturnType<typeof useRouter>, email: string, devCode?: string) {
  try {
    if (devCode) sessionStorage.setItem('closebuyDevVerifyCode', devCode);
  } catch {}
  router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
}
