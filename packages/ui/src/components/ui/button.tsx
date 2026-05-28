import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '../../utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center border border-transparent bg-clip-padding font-semibold whitespace-nowrap shadow-xs transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:outline-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:focus-visible:ring-offset-background dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[var(--tcg-red-dark)] active:bg-[var(--tcg-red-dark)]',
        outline:
          'border-border bg-card text-foreground shadow-none hover:bg-muted hover:text-foreground active:bg-accent aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-none hover:bg-[var(--surface-container-high)] active:bg-accent aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'bg-transparent text-foreground shadow-none hover:bg-muted hover:text-foreground active:bg-accent aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:text-[#410004] dark:focus-visible:ring-destructive/40',
        link: 'text-primary shadow-none underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-9 gap-1.5 rounded-md px-4 text-sm leading-none has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-md px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-10 gap-2 rounded-md px-5 text-sm leading-none has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        search: 'h-11 gap-2 rounded-full px-5 text-sm leading-none sm:px-8',
        auth: 'h-11 w-full gap-2 rounded-lg px-4 text-base leading-none',
        cta: 'min-h-14 flex-1 gap-2 rounded-2xl px-8 py-4 text-lg leading-none font-bold',
        tab: 'h-8 gap-1 rounded-full px-3 text-sm leading-none shadow-none',
        pill: 'h-8 gap-1.5 rounded-full px-3 text-sm leading-none',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  const typeProps = asChild ? (type ? { type } : {}) : { type: type ?? 'button' };

  return (
    <Comp
      ref={ref}
      data-slot='button'
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...typeProps}
      {...props}
    />
  );
});

export { Button, buttonVariants };
