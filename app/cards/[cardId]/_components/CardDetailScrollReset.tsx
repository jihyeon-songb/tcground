'use client';

import { useEffect } from 'react';

export function CardDetailScrollReset({ currentPath }: { currentPath: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPath]);

  return null;
}
