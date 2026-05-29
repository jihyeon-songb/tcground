'use client';

import * as React from 'react';

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
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList(props: React.ComponentProps<'div'>) {
  const { orientation } = useTabsContext('TabsList');

  return (
    <div role='tablist' aria-orientation={orientation} data-slot='tabs-list' {...props} />
  );
}

interface TabsTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

function TabsTrigger({ disabled, onClick, onKeyDown, value, ...props }: TabsTriggerProps) {
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

function TabsContent({ value, ...props }: TabsContentProps) {
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
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsTriggerProps, TabsContentProps, TabsOrientation, TabsActivationMode };
