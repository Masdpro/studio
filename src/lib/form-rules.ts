import * as z from 'zod';
import { rules, type Rule } from '@/lib/field-rules';

/** A zod string checked by one of the shared field rules (website forms built with react-hook-form). */
export const zRule = (rule: Rule) =>
  z.string().superRefine((value, ctx) => {
    const message = rule(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  });

/** Like zRule, but the field may be left out entirely. */
export const zOptionalRule = (rule: Rule) => zRule(rule).optional();

/**
 * A password field that is only required while `needed()` is true (business sign-up forms ask for
 * a password only when the person isn't signed in yet).
 */
export const zPasswordWhen = (needed: () => boolean) =>
  z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (!needed()) return;
      const message = rules.newPassword(value ?? '');
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    });
