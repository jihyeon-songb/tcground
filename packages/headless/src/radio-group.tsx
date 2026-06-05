'use client';

import * as React from 'react';

import { composeEventHandlers } from './primitive.js';

interface RadioGroupContextValue {
  disabled?: boolean;
  name?: string;
  required?: boolean;
  setValue: (value: string) => void;
  value?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext(componentName: string) {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error(`${componentName} must be used within RadioGroup`);
  }

  return context;
}

interface RadioGroupProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  value?: string;
}

function RadioGroup({
  defaultValue,
  disabled,
  name,
  onValueChange,
  required,
  value: valueProp,
  ...props
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolledValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  return (
    <RadioGroupContext.Provider value={{ disabled, name, required, setValue, value }}>
      <div role='radiogroup' aria-required={required} data-slot='radio-group' {...props} />
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

interface RadioGroupItemContextValue {
  checked: boolean;
}

const RadioGroupItemContext = React.createContext<RadioGroupItemContextValue | null>(null);

function RadioGroupItem({
  disabled: itemDisabled,
  onClick,
  onKeyDown,
  value,
  ...props
}: RadioGroupItemProps) {
  const context = useRadioGroupContext('RadioGroupItem');
  const checked = context.value === value;
  const disabled = context.disabled || itemDisabled;

  const moveFocus = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, direction: 'next' | 'prev') => {
      const group = event.currentTarget.closest('[role="radiogroup"]');
      const radios = Array.from(
        group?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? [],
      );
      const currentIndex = radios.indexOf(event.currentTarget);

      if (currentIndex === -1 || radios.length === 0) {
        return;
      }

      const nextIndex =
        direction === 'next'
          ? (currentIndex + 1) % radios.length
          : (currentIndex - 1 + radios.length) % radios.length;
      const nextRadio = radios[nextIndex];

      event.preventDefault();
      nextRadio.focus();

      // Radios select as focus moves (single tab stop, arrow to choose).
      const nextValue = nextRadio.getAttribute('data-value');
      if (nextValue) {
        context.setValue(nextValue);
      }
    },
    [context],
  );

  return (
    <RadioGroupItemContext.Provider value={{ checked }}>
      <button
        type='button'
        role='radio'
        aria-checked={checked}
        data-slot='radio-group-item'
        data-value={value}
        data-checked={checked ? '' : undefined}
        data-unchecked={checked ? undefined : ''}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        tabIndex={checked || context.value === undefined ? 0 : -1}
        onClick={composeEventHandlers(onClick, () => context.setValue(value))}
        onKeyDown={composeEventHandlers(onKeyDown, (event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            moveFocus(event, 'next');
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            moveFocus(event, 'prev');
          } else if (event.key === ' ') {
            event.preventDefault();
            context.setValue(value);
          } else if (event.key === 'Enter') {
            event.preventDefault();
          }
        })}
        {...props}
      />
    </RadioGroupItemContext.Provider>
  );
}

function RadioGroupIndicator({
  forceMount,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { forceMount?: boolean }) {
  const context = React.useContext(RadioGroupItemContext);

  if (!context) {
    throw new Error('RadioGroupIndicator must be used within RadioGroupItem');
  }

  if (!forceMount && !context.checked) {
    return null;
  }

  return <span data-slot='radio-group-indicator' aria-hidden='true' {...props} />;
}

export { RadioGroup, RadioGroupItem, RadioGroupIndicator };
export type { RadioGroupProps, RadioGroupItemProps };
