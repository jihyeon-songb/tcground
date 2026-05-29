'use client';

import * as React from 'react';

import { composeEventHandlers } from './primitive';

interface SwitchContextValue {
  checked: boolean;
  disabled?: boolean;
}

const SwitchContext = React.createContext<SwitchContextValue | null>(null);

function useSwitchContext(componentName: string) {
  const context = React.useContext(SwitchContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Switch`);
  }

  return context;
}

interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'checked' | 'defaultChecked' | 'value' | 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  required?: boolean;
}

function Switch({
  checked: checkedProp,
  defaultChecked = false,
  disabled,
  onCheckedChange,
  onClick,
  onKeyDown,
  required,
  ...props
}: SwitchProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isControlled = checkedProp !== undefined;
  const checked = isControlled ? checkedProp : uncontrolledChecked;

  const toggle = React.useCallback(() => {
    const nextChecked = !checked;

    if (!isControlled) {
      setUncontrolledChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);
  }, [checked, isControlled, onCheckedChange]);

  return (
    <SwitchContext.Provider value={{ checked, disabled }}>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-required={required}
        data-slot='switch'
        data-checked={checked ? '' : undefined}
        data-unchecked={checked ? undefined : ''}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        onClick={composeEventHandlers(onClick, toggle)}
        onKeyDown={composeEventHandlers(onKeyDown, (event) => {
          // Toggle on Space; never submit a surrounding form on Enter.
          if (event.key === 'Enter') {
            event.preventDefault();
          }
        })}
        {...props}
      />
    </SwitchContext.Provider>
  );
}

function SwitchThumb(props: React.HTMLAttributes<HTMLSpanElement>) {
  const context = useSwitchContext('SwitchThumb');

  return (
    <span
      data-slot='switch-thumb'
      data-checked={context.checked ? '' : undefined}
      data-unchecked={context.checked ? undefined : ''}
      {...props}
    />
  );
}

export { Switch, SwitchThumb };
export type { SwitchProps };
