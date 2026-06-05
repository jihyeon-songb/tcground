'use client';

import * as React from 'react';

import { composeEventHandlers, PrimitiveSlot } from './primitive.js';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, type, disabled, onClick, tabIndex, ...props },
  ref,
) {
  const Comp = asChild ? PrimitiveSlot : 'button';
  const typeProps = asChild ? (type ? { type } : {}) : { type: type ?? 'button' };
  const disabledProps = asChild
    ? {
        'aria-disabled': disabled || undefined,
        'data-disabled': disabled ? '' : undefined,
        tabIndex: disabled ? -1 : tabIndex,
        onClick: disabled
          ? (event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
            }
          : onClick,
      }
    : {
        disabled,
        onClick: composeEventHandlers(onClick, (event) => {
          if (!disabled) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
        }),
        tabIndex,
      };

  return <Comp ref={ref} data-slot='button' {...typeProps} {...disabledProps} {...props} />;
});

export { Button };
export type { ButtonProps };
