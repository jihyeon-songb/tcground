'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../utils';
import { composeEventHandlers } from './primitive';

type TabsOrientation = 'horizontal' | 'vertical';
type TabsActivationMode = 'automatic' | 'manual';

interface TabsContextValue {
  activationMode: TabsActivationMode;
  baseId: string;
  orientation: TabsOrientation;
  setValue: (value: string) => void;
  value?: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string) {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Tabs`);
  }

  return context;
}

function getTabId(baseId: string, value: string) {
  return `${baseId}-tab-${value}`;
}

function getPanelId(baseId: string, value: string) {
  return `${baseId}-panel-${value}`;
}

interface TabsProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  activationMode?: TabsActivationMode;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  value?: string;
}

function Tabs({
  activationMode = 'automatic',
  className,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  value: valueProp,
  ...props
}: TabsProps) {
  const reactId = React.useId();
  const baseId = React.useMemo(() => `tcground-tabs-${reactId.replace(/:/g, '')}`, [reactId]);
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
    <TabsContext.Provider value={{ activationMode, baseId, orientation, setValue, value }}>
      <div
        data-slot='tabs'
        data-orientation={orientation}
        data-horizontal={orientation === 'horizontal' ? '' : undefined}
        data-vertical={orientation === 'vertical' ? '' : undefined}
        className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof tabsListVariants>) {
  const { orientation } = useTabsContext('TabsList');

  return (
    <div
      role='tablist'
      aria-orientation={orientation}
      data-slot='tabs-list'
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

function TabsTrigger({ className, disabled, onClick, onKeyDown, value, ...props }: TabsTriggerProps) {
  const context = useTabsContext('TabsTrigger');
  const selected = context.value === value;
  const tabId = getTabId(context.baseId, value);
  const panelId = getPanelId(context.baseId, value);

  const moveFocus = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, direction: 'first' | 'last' | 'next' | 'prev') => {
      const list = event.currentTarget.closest('[role="tablist"]');
      const tabs = Array.from(
        list?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
      );
      const currentIndex = tabs.indexOf(event.currentTarget);

      if (currentIndex === -1 || tabs.length === 0) {
        return;
      }

      const nextIndex =
        direction === 'first'
          ? 0
          : direction === 'last'
            ? tabs.length - 1
            : direction === 'next'
              ? (currentIndex + 1) % tabs.length
              : (currentIndex - 1 + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];

      event.preventDefault();
      nextTab.focus();

      if (context.activationMode === 'automatic') {
        const nextValue = nextTab.getAttribute('data-value');
        if (nextValue) {
          context.setValue(nextValue);
        }
      }
    },
    [context],
  );

  return (
    <button
      type='button'
      role='tab'
      id={tabId}
      aria-controls={panelId}
      aria-selected={selected}
      data-active={selected ? '' : undefined}
      data-slot='tabs-trigger'
      data-value={value}
      disabled={disabled}
      tabIndex={selected || context.value === undefined ? 0 : -1}
      className={cn(
        "text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground',
        'after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      onClick={composeEventHandlers(onClick, () => context.setValue(value))}
      onKeyDown={composeEventHandlers(onKeyDown, (event) => {
        const previousKey = context.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = context.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

        if (event.key === previousKey) {
          moveFocus(event, 'prev');
        } else if (event.key === nextKey) {
          moveFocus(event, 'next');
        } else if (event.key === 'Home') {
          moveFocus(event, 'first');
        } else if (event.key === 'End') {
          moveFocus(event, 'last');
        } else if (context.activationMode === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          context.setValue(value);
        }
      })}
      {...props}
    />
  );
}

interface TabsContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value'> {
  value: string;
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const context = useTabsContext('TabsContent');
  const selected = context.value === value;

  return (
    <div
      role='tabpanel'
      id={getPanelId(context.baseId, value)}
      aria-labelledby={getTabId(context.baseId, value)}
      data-slot='tabs-content'
      hidden={!selected}
      tabIndex={0}
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
