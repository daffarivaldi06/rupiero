/** A UNIQUE constraint failed, e.g. an account or category name that is already taken (names ignore case). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}
