'use client';

import * as React from 'react';

import { composeEventHandlers } from './primitive';

type CheckedState = boolean | 'indeterminate';

interface CheckboxContextValue {
  checked: CheckedState;
  disabled?: boolean;
}

const CheckboxContext = React.createContext<CheckboxContextValue | null>(null);

function useCheckboxContext(componentName: string) {
  const context = React.useContext(CheckboxContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Checkbox`);
  }

  return context;
}

interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'checked' | 'defaultChecked' | 'value' | 'onChange'> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  required?: boolean;
}

function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  disabled,
  onCheckedChange,
  onClick,
  onKeyDown,
  required,
  ...props
}: CheckboxProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isControlled = checkedProp !== undefined;
  const checked = isControlled ? checkedProp : uncontrolledChecked;

  const toggle = React.useCallback(() => {
    const nextChecked = checked === 'indeterminate' ? true : !checked;

    if (!isControlled) {
      setUncontrolledChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);
  }, [checked, isControlled, onCheckedChange]);

  return (
    <CheckboxContext.Provider value={{ checked, disabled }}>
      <button
        type='button'
        role='checkbox'
        aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
        aria-required={required}
        data-slot='checkbox'
        data-checked={checked === true ? '' : undefined}
        data-unchecked={checked === false ? '' : undefined}
        data-indeterminate={checked === 'indeterminate' ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        onClick={composeEventHandlers(onClick, toggle)}
        onKeyDown={composeEventHandlers(onKeyDown, (event) => {
          // Checkboxes toggle on Space and must not submit a surrounding form on Enter.
          if (event.key === 'Enter') {
            event.preventDefault();
          }
        })}
        {...props}
      />
    </CheckboxContext.Provider>
  );
}

interface CheckboxIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  forceMount?: boolean;
}

function CheckboxIndicator({ children, forceMount, ...props }: CheckboxIndicatorProps) {
  const context = useCheckboxContext('CheckboxIndicator');
  const visible = context.checked === true || context.checked === 'indeterminate';

  if (!forceMount && !visible) {
    return null;
  }

  return (
    <span data-slot='checkbox-indicator' aria-hidden='true' {...props}>
      {children}
    </span>
  );
}

export { Checkbox, CheckboxIndicator };
export type { CheckboxProps, CheckboxIndicatorProps, CheckedState };
