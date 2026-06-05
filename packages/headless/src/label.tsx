'use client';

import * as React from 'react';

import { composeEventHandlers } from './primitive.js';

type LabelProps = React.ComponentProps<'label'>;

function Label({ onMouseDown, ...props }: LabelProps) {
  return (
    <label
      data-slot='label'
      onMouseDown={composeEventHandlers(onMouseDown, (event) => {
        // Prevent text selection when double-clicking the label, while still
        // letting a single click forward focus to the associated control.
        if (event.detail > 1) {
          event.preventDefault();
        }
      })}
      {...props}
    />
  );
}

export { Label };
export type { LabelProps };
