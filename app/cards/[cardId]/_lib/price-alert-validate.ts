// Pure helper split out of the `'use server'` action module: a `'use server'`
// file may only export async functions, so this sync validator lives here.
export function isValidThreshold(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}
