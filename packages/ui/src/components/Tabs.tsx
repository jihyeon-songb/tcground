import * as React from 'react';

import { composeEventHandlers, cx, useControllableState } from '../utils/compose';

interface TabsContextValue {
  setValue: (value: string) => void;
  value: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string) {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error(`${componentName} must be used inside Tabs.Root.`);
  }

  return context;
}

export interface TabsRootProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  onValueChange?: (value: string) => void;
  value?: string;
}

export function TabsRoot({
  children,
  defaultValue,
  onValueChange,
  value,
  ...props
}: TabsRootProps) {
  const [currentValue, setCurrentValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  return (
    <TabsContext.Provider value={{ setValue: setCurrentValue, value: currentValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
  onKeyDown,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx('pui-tabs-list', className)}
      onKeyDown={composeEventHandlers(onKeyDown, (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
          return;
        }

        const triggers = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
        );
        const focusedIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
        const selectedIndex = triggers.findIndex(
          (trigger) => trigger.getAttribute('aria-selected') === 'true',
        );
        const currentIndex = focusedIndex >= 0 ? focusedIndex : Math.max(selectedIndex, 0);
        const nextIndex =
          event.key === 'ArrowRight'
            ? (currentIndex + 1) % triggers.length
            : (currentIndex - 1 + triggers.length) % triggers.length;

        event.preventDefault();
        triggers[nextIndex]?.focus();
        triggers[nextIndex]?.click();
      })}
      role='tablist'
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ children, className, onClick, value, ...props }: TabsTriggerProps) {
  const context = useTabsContext('Tabs.Trigger');
  const selected = context.value === value;
  const baseId = `pui-tabs-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <button
      {...props}
      aria-controls={`${baseId}-panel`}
      aria-selected={selected}
      className={cx('pui-tabs-trigger', className)}
      id={`${baseId}-trigger`}
      onClick={composeEventHandlers(onClick, () => context.setValue(value))}
      role='tab'
      tabIndex={selected ? 0 : -1}
      type='button'
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsPanel({ children, hidden, value, ...props }: TabsPanelProps) {
  const context = useTabsContext('Tabs.Panel');
  const active = context.value === value;
  const baseId = `pui-tabs-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div
      {...props}
      aria-labelledby={`${baseId}-trigger`}
      hidden={hidden ?? !active}
      id={`${baseId}-panel`}
      role='tabpanel'
      tabIndex={0}
    >
      {active ? children : null}
    </div>
  );
}

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
};
