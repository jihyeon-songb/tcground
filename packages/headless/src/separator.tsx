'use client';

import * as React from 'react';

type SeparatorOrientation = 'horizontal' | 'vertical';

interface SeparatorProps extends Omit<React.ComponentProps<'div'>, 'role'> {
  decorative?: boolean;
  orientation?: SeparatorOrientation;
}

function Separator({ decorative = true, orientation = 'horizontal', ...props }: SeparatorProps) {
  // A decorative separator carries no semantic meaning, so it is hidden from
  // assistive tech. A semantic one exposes role/orientation per ARIA.
  const semanticProps = decorative
    ? { role: 'none' as const }
    : {
        role: 'separator' as const,
        'aria-orientation': orientation === 'vertical' ? ('vertical' as const) : undefined,
      };

  return (
    <div
      data-slot='separator'
      data-orientation={orientation}
      data-horizontal={orientation === 'horizontal' ? '' : undefined}
      data-vertical={orientation === 'vertical' ? '' : undefined}
      {...semanticProps}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps, SeparatorOrientation };
