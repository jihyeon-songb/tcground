import * as React from 'react';

import { composeEventHandlers, cx, useControllableState } from '../utils/compose';

interface DropdownMenuContextValue {
  activeIndex: number;
  itemCollectionRef: React.RefObject<Array<HTMLButtonElement>>;
  open: boolean;
  registerItem: (node: HTMLButtonElement) => number;
  setActiveIndex: (index: number) => void;
  setOpen: (open: boolean) => void;
  triggerId: string;
  unregisterItem: (node: HTMLButtonElement) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(componentName: string) {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error(`${componentName} must be used inside DropdownMenu.Root.`);
  }

  return context;
}

export interface DropdownMenuRootProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function DropdownMenuRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open,
}: DropdownMenuRootProps) {
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [activeIndex, setActiveIndex] = React.useState(0);
  const itemCollectionRef = React.useRef<Array<HTMLButtonElement>>([]);
  const triggerId = React.useId();
  const registerItem = React.useCallback((node: HTMLButtonElement) => {
    const currentIndex = itemCollectionRef.current.indexOf(node);

    if (currentIndex >= 0) {
      return currentIndex;
    }

    itemCollectionRef.current = [...itemCollectionRef.current, node];
    return itemCollectionRef.current.length - 1;
  }, []);
  const unregisterItem = React.useCallback((node: HTMLButtonElement) => {
    itemCollectionRef.current = itemCollectionRef.current.filter((item) => item !== node);
  }, []);

  React.useEffect(() => {
    if (currentOpen) {
      itemCollectionRef.current[activeIndex]?.focus();
    }
  }, [activeIndex, currentOpen]);

  return (
    <DropdownMenuContext.Provider
      value={{
        activeIndex,
        itemCollectionRef,
        open: currentOpen,
        registerItem,
        setActiveIndex,
        setOpen: setCurrentOpen,
        triggerId,
        unregisterItem,
      }}
    >
      <div style={{ display: 'inline-block', position: 'relative' }}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function DropdownMenuTrigger({ children, onClick, onKeyDown, ...props }, forwardedRef) {
  const context = useDropdownMenuContext('DropdownMenu.Trigger');

  return (
    <button
      {...props}
      aria-expanded={context.open}
      aria-haspopup='menu'
      className={cx('pui-dropdown-trigger', props.className)}
      id={context.triggerId}
      onClick={composeEventHandlers(onClick, () => context.setOpen(!context.open))}
      onKeyDown={composeEventHandlers(onKeyDown, (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          context.setActiveIndex(0);
          context.setOpen(true);
        }
      })}
      ref={forwardedRef}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  );
});

export function DropdownMenuContent({
  children,
  className,
  onKeyDown,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = useDropdownMenuContext('DropdownMenu.Content');

  if (!context.open) {
    return null;
  }

  return (
    <div
      {...props}
      aria-labelledby={context.triggerId}
      className={cx('pui-dropdown-content', className)}
      onKeyDown={composeEventHandlers(onKeyDown, (event) => {
        const enabledItems = context.itemCollectionRef.current;

        if (event.key === 'Escape') {
          context.setOpen(false);
          return;
        }

        if (enabledItems.length === 0) {
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          context.setActiveIndex((context.activeIndex + 1) % enabledItems.length);
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          context.setActiveIndex(
            (context.activeIndex - 1 + enabledItems.length) % enabledItems.length,
          );
        }
      })}
      role='menu'
    >
      {children}
    </div>
  );
}

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index?: number;
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ children, index, onClick, onMouseEnter, ...props }, forwardedRef) {
    const context = useDropdownMenuContext('DropdownMenu.Item');
    const itemRef = React.useRef<HTMLButtonElement | null>(null);
    const [registeredIndex, setRegisteredIndex] = React.useState(index ?? -1);
    const itemIndex = index ?? registeredIndex;
    const setItemRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        itemRef.current = node;

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }

        if (!node || index !== undefined) {
          return;
        }

        setRegisteredIndex(context.registerItem(node));
      },
      [context, forwardedRef, index],
    );

    React.useEffect(() => {
      const node = itemRef.current;

      return () => {
        if (node && index === undefined) {
          context.unregisterItem(node);
        }
      };
    }, [context, index]);

    return (
      <button
        {...props}
        className={cx('pui-dropdown-item', props.className)}
        data-highlighted={context.activeIndex === itemIndex ? true : undefined}
        onClick={composeEventHandlers(onClick, () => context.setOpen(false))}
        onMouseEnter={composeEventHandlers(onMouseEnter, () => context.setActiveIndex(itemIndex))}
        ref={setItemRefs}
        role='menuitem'
        tabIndex={context.activeIndex === itemIndex ? 0 : -1}
        type='button'
      >
        {children}
      </button>
    );
  },
);

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
};
