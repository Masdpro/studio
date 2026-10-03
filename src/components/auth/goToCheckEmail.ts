import type { useRouter } from 'next/navigation';

/** After sign-up, send the user to the "check your email" page (carrying the dev-only link, if any). */
export function goToCheckEmail(router: ReturnType<typeof useRouter>, email: string, devLink?: string) {
  try {
    if (devLink) sessionStorage.setItem('closebuyDevVerifyLink', devLink);
  } catch {}
  router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
}
