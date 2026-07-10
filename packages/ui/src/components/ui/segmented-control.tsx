'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem, type RadioGroupProps } from '@tcground/headless';

import { cn } from '../../utils.js';

function SegmentedControl({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroup
      data-slot='segmented-control'
      className={cn('inline-flex items-center gap-1 rounded-full bg-muted p-1', className)}
      {...props}
    />
  );
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupItem>) {
  return (
    <RadioGroupItem
      data-slot='segmented-control-item'
      className={cn(
        'h-8 shrink-0 cursor-pointer rounded-full px-3 text-sm leading-none font-semibold',
        'whitespace-nowrap outline-none transition-colors',
        'text-muted-foreground hover:text-foreground',
        'data-checked:bg-card data-checked:text-foreground data-checked:shadow-xs',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export { SegmentedControl, SegmentedControlItem };
