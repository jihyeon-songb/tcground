import * as React from 'react';

import { composeEventHandlers, composeRefs, cx } from '../utils/compose';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    asChild = false,
    children,
    className,
    disabled = false,
    onClick,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  forwardedRef,
) {
  const sharedProps = {
    className: cx('pui-button', className),
    'data-size': size,
    'data-variant': variant,
  };

  if (asChild) {
    if (!React.isValidElement(children)) {
      throw new Error('Button with asChild expects a single valid React element child.');
    }

    const child = children as React.ReactElement<
      React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
    >;

    return React.cloneElement(child, {
      ...props,
      ...sharedProps,
      'aria-disabled': disabled || props['aria-disabled'] ? true : undefined,
      onClick: composeEventHandlers(child.props.onClick, (event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
      }),
      ref: composeRefs(child.props.ref, forwardedRef as React.Ref<HTMLElement>),
      tabIndex: disabled ? -1 : child.props.tabIndex,
    });
  }

  return (
    <button
      {...props}
      {...sharedProps}
      disabled={disabled}
      onClick={onClick}
      ref={forwardedRef}
      type={type}
    >
      {children}
    </button>
  );
});
