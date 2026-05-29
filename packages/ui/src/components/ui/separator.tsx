'use client';

import * as React from 'react';
import {
  Separator as HeadlessSeparator,
  type SeparatorProps as HeadlessSeparatorProps,
} from '@tcground/headless';

import { cn } from '../../utils';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: HeadlessSeparatorProps) {
  return (
    <HeadlessSeparator
      data-slot='separator'
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
