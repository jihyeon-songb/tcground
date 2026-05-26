import * as React from 'react';

import { composeEventHandlers, cx, useControllableState } from '../utils/compose';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  pressed?: boolean;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    children,
    className,
    defaultPressed = false,
    onClick,
    onPressedChange,
    pressed,
    ...props
  },
  forwardedRef,
) {
  const [currentPressed, setCurrentPressed] = useControllableState({
    value: pressed,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
  });

  return (
    <button
      {...props}
      aria-pressed={currentPressed}
      className={cx('pui-toggle', className)}
      onClick={composeEventHandlers(onClick, () => setCurrentPressed(!currentPressed))}
      ref={forwardedRef}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  );
});
