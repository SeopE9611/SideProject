import { NextResponse } from 'next/server';
import type { z } from 'zod';

export type AdminApiFieldErrors = Record<string, string[]>;

export type AdminApiValidationDetail = {
  code: string;
  message: string;
  path: string;
};

export function adminValidationError(error: string, fieldErrors?: AdminApiFieldErrors, details?: AdminApiValidationDetail[]) {
  return NextResponse.json(
    {
      message: 'INVALID_FIELDS',
      error,
      fieldErrors: fieldErrors ?? null,
      details: details ?? null,
    },
    { status: 400 },
  );
}

export function zodIssuesToDetails(issues: z.ZodIssue[]): AdminApiValidationDetail[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.map(String).join('.') || '(root)',
  }));
}
