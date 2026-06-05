'use client';

import * as React from 'react';

type AnyProps = Record<string, unknown>;

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }

      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}

function composeEventHandlers<Event extends { defaultPrevented: boolean }>(
  theirHandler?: (event: Event) => void,
  ourHandler?: (event: Event) => void,
) {
  return (event: Event) => {
    theirHandler?.(event);

    if (!event.defaultPrevented) {
      ourHandler?.(event);
    }
  };
}

function getElementRef(element: React.ReactElement) {
  return (element.props as { ref?: React.Ref<unknown> }).ref;
}

function mergeSlotProps(slotProps: AnyProps, childProps: AnyProps) {
  const overrideProps = { ...slotProps };

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];

    const isHandler = /^on[A-Z]/.test(propName);

    if (isHandler && typeof slotPropValue === 'function' && typeof childPropValue === 'function') {
      overrideProps[propName] = composeEventHandlers(
        childPropValue as never,
        slotPropValue as never,
      );
      continue;
    }

    if (propName === 'style') {
      overrideProps[propName] = {
        ...(slotPropValue as React.CSSProperties | undefined),
        ...(childPropValue as React.CSSProperties | undefined),
      };
      continue;
    }

    if (propName === 'className') {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ');
      continue;
    }

    overrideProps[propName] = childPropValue;
  }

  return overrideProps;
}

interface PrimitiveSlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

const PrimitiveSlot = React.forwardRef<HTMLElement, PrimitiveSlotProps>(function PrimitiveSlot(
  { children, ...slotProps },
  forwardedRef,
) {
  if (!React.isValidElement(children)) {
    return null;
  }

  const child = children as React.ReactElement<AnyProps>;
  const props = mergeSlotProps(slotProps, child.props);

  return React.cloneElement(child, {
    ...props,
    ref: composeRefs(forwardedRef, getElementRef(child)),
  });
});

export { PrimitiveSlot, composeEventHandlers, composeRefs };
