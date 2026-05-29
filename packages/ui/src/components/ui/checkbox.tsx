'use client';

import {
  Checkbox as HeadlessCheckbox,
  CheckboxIndicator as HeadlessCheckboxIndicator,
  type CheckboxProps as HeadlessCheckboxProps,
} from '@tcground/headless';

import { cn } from '../../utils';
import { CheckIcon } from 'lucide-react';

function Checkbox({ className, ...props }: HeadlessCheckboxProps) {
  return (
    <HeadlessCheckbox
      data-slot='checkbox'
      className={cn(
        'peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3',
        className,
      )}
      {...props}
    >
      <HeadlessCheckboxIndicator
        data-slot='checkbox-indicator'
        className='grid place-content-center text-current transition-none [&>svg]:size-3.5'
      >
        <CheckIcon />
      </HeadlessCheckboxIndicator>
    </HeadlessCheckbox>
  );
}

export { Checkbox };
