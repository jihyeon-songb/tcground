import Link from 'next/link';
import { Button } from '@tcground/ui';
import { getAuthEntryHref } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/components/tcg/auth/logout-action';

/**
 * Auth-dependent slice of the header. It reads request cookies (`getClaims`),
 * which would otherwise force the whole header — and every page that renders it —
 * to block on a Supabase auth round-trip. Rendering it inside a `<Suspense>`
 * boundary (see `PublicHeader`) lets the static shell paint immediately while
 * just the login/logout buttons stream in.
 */
export async function HeaderAuthActions({ currentPath }: { currentPath: string }) {
  const isAuthenticated = await getIsAuthenticated();

  if (isAuthenticated) {
    return (
      <form action={logout}>
        <Button type='submit' className='px-6'>
          로그아웃
        </Button>
      </form>
    );
  }

  return (
    <>
      <Link
        className='hidden font-normal whitespace-nowrap text-muted-foreground hover:text-tcg-red md:block'
        href={getAuthEntryHref('/login', currentPath)}
      >
        로그인
      </Link>
      <Button asChild className='px-6'>
        <Link href={getAuthEntryHref('/signup', currentPath)}>가입하기</Link>
      </Button>
    </>
  );
}

/**
 * Skeleton shown while {@link HeaderAuthActions} streams. Matches the rendered
 * buttons' footprint so the header doesn't shift when auth state resolves.
 */
export function HeaderAuthActionsFallback() {
  return (
    <>
      <span className='hidden h-5 w-10 animate-pulse rounded bg-muted md:block' aria-hidden />
      <span className='h-10 w-24 animate-pulse rounded-md bg-muted' aria-hidden />
    </>
  );
}

async function getIsAuthenticated() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    return !error && Boolean(data?.claims);
  } catch {
    return false;
  }
}
