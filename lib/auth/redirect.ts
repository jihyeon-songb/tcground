const INTERNAL_ORIGIN = 'https://tcground.local';
const AUTH_ENTRY_PATHS = new Set(['/login', '/signup']);

export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.startsWith('//')) {
    return '/';
  }

  try {
    const nextUrl = new URL(trimmedValue, INTERNAL_ORIGIN);

    if (nextUrl.origin !== INTERNAL_ORIGIN || AUTH_ENTRY_PATHS.has(nextUrl.pathname)) {
      return '/';
    }

    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  } catch {
    return '/';
  }
}

export function getAuthConfirmRedirectUrl(origin: string, nextPath: string) {
  const confirmUrl = new URL('/auth/confirm', origin);
  confirmUrl.searchParams.set('next', getSafeNextPath(nextPath));
  return confirmUrl.toString();
}

export function getAuthEntryHref(pathname: '/login' | '/signup', nextPath: string) {
  const safeNextPath = getSafeNextPath(nextPath);

  if (safeNextPath === '/') {
    return pathname;
  }

  const entryUrl = new URL(pathname, INTERNAL_ORIGIN);
  entryUrl.searchParams.set('next', safeNextPath);
  return `${entryUrl.pathname}${entryUrl.search}`;
}
