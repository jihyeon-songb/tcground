'use client';

/* eslint-disable react-hooks/refs -- Dialog is a focus-management primitive that must wire and read DOM refs in event handlers/effects. */

import * as React from 'react';
import { createPortal } from 'react-dom';

import { composeEventHandlers, composeRefs, PrimitiveSlot } from './primitive.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type DialogRole = 'dialog' | 'alertdialog';

interface DialogContextValue {
  contentId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  descriptionId: string;
  dismissOnOverlayClick: boolean;
  modal: boolean;
  open: boolean;
  previousActiveElementRef: React.RefObject<HTMLElement | null>;
  rememberActiveElement: (element: HTMLElement | null) => void;
  role: DialogRole;
  setOpen: (open: boolean) => void;
  titleId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(componentName: string) {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Dialog`);
  }

  return context;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
  );
}

function useBodyHiddenSiblings(portalNode: HTMLElement | null, active: boolean) {
  React.useEffect(() => {
    if (!active || !portalNode) {
      return;
    }

    const siblings = Array.from(document.body.children).filter(
      (element) => element !== portalNode,
    ) as HTMLElement[];
    const previousValues = siblings.map((element) => element.getAttribute('aria-hidden'));

    for (const sibling of siblings) {
      sibling.setAttribute('aria-hidden', 'true');
    }

    return () => {
      siblings.forEach((sibling, index) => {
        const previousValue = previousValues[index];

        if (previousValue === null) {
          sibling.removeAttribute('aria-hidden');
        } else {
          sibling.setAttribute('aria-hidden', previousValue);
        }
      });
    };
  }, [active, portalNode]);
}

function usePortalNode(active: boolean) {
  const [portalNode] = React.useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') {
      return null;
    }

    const node = document.createElement('div');
    node.setAttribute('data-slot', 'dialog-portal');
    return node;
  });

  React.useEffect(() => {
    if (!active || !portalNode) {
      return;
    }

    document.body.appendChild(portalNode);

    return () => {
      document.body.removeChild(portalNode);
    };
  }, [active, portalNode]);

  return portalNode;
}

interface DialogProps {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  dismissOnOverlayClick?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  role?: DialogRole;
}

function Dialog({
  children,
  defaultOpen = false,
  dismissOnOverlayClick = true,
  modal = true,
  onOpenChange,
  open,
  role = 'dialog',
}: DialogProps) {
  const reactId = React.useId();
  const baseId = React.useMemo(() => `tcground-dialog-${reactId.replace(/:/g, '')}`, [reactId]);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  const rememberActiveElement = React.useCallback((element: HTMLElement | null) => {
    if (element && element !== document.body) {
      previousActiveElementRef.current = element;
    }
  }, []);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const activeElement =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        rememberActiveElement(activeElement);
      }

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange, rememberActiveElement],
  );

  return (
    <DialogContext.Provider
      value={{
        contentId: `${baseId}-content`,
        contentRef,
        descriptionId: `${baseId}-description`,
        dismissOnOverlayClick,
        modal,
        open: currentOpen,
        previousActiveElementRef,
        rememberActiveElement,
        role,
        setOpen,
        titleId: `${baseId}-title`,
        triggerRef,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLElement, DialogTriggerProps>(function DialogTrigger(
  { asChild = false, onClick, type = 'button', ...props },
  forwardedRef,
) {
  const context = useDialogContext('DialogTrigger');
  const triggerProps = {
    dataSlot: 'dialog-trigger',
    ariaHaspopup: 'dialog' as const,
    ariaExpanded: context.open,
    ariaControls: context.contentId,
    onClick: composeEventHandlers(onClick, (event) => {
      context.rememberActiveElement(event.currentTarget);
      context.setOpen(true);
    }),
  };

  if (asChild) {
    return (
      <PrimitiveSlot
        ref={composeRefs(forwardedRef, context.triggerRef)}
        data-slot={triggerProps.dataSlot}
        aria-haspopup={triggerProps.ariaHaspopup}
        aria-expanded={triggerProps.ariaExpanded}
        aria-controls={triggerProps.ariaControls}
        onClick={triggerProps.onClick}
        {...props}
      />
    );
  }

  return (
    <button
      ref={composeRefs(forwardedRef, context.triggerRef)}
      data-slot={triggerProps.dataSlot}
      type={type}
      aria-haspopup={triggerProps.ariaHaspopup}
      aria-expanded={triggerProps.ariaExpanded}
      aria-controls={triggerProps.ariaControls}
      onClick={triggerProps.onClick}
      {...props}
    />
  );
});

function DialogPortal({ children }: { children: React.ReactNode }) {
  const context = useDialogContext('DialogPortal');
  const portalNode = usePortalNode(context.open);
  useBodyHiddenSiblings(portalNode, context.open && context.modal);

  if (!context.open || !portalNode) {
    return null;
  }

  return createPortal(children, portalNode);
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLElement, DialogCloseProps>(function DialogClose(
  { asChild = false, onClick, type = 'button', ...props },
  forwardedRef,
) {
  const context = useDialogContext('DialogClose');

  if (asChild) {
    return (
      <PrimitiveSlot
        ref={forwardedRef}
        data-slot='dialog-close'
        onClick={composeEventHandlers(onClick, () => context.setOpen(false))}
        {...props}
      />
    );
  }

  return (
    <button
      ref={forwardedRef as React.Ref<HTMLButtonElement>}
      data-slot='dialog-close'
      type={type}
      onClick={composeEventHandlers(onClick, () => context.setOpen(false))}
      {...props}
    />
  );
});

function DialogOverlay({ onMouseDown, ...props }: React.ComponentProps<'div'>) {
  const context = useDialogContext('DialogOverlay');

  return (
    <div
      data-slot='dialog-overlay'
      data-state={context.open ? 'open' : 'closed'}
      data-open={context.open ? '' : undefined}
      onMouseDown={composeEventHandlers(onMouseDown, (event) => {
        if (context.dismissOnOverlayClick && event.target === event.currentTarget) {
          context.setOpen(false);
        }
      })}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentProps<'div'> {
  describedBy?: string;
  labelledBy?: string;
}

function DialogContent({
  children,
  describedBy,
  labelledBy,
  onKeyDown,
  ...props
}: DialogContentProps) {
  const context = useDialogContext('DialogContent');

  React.useEffect(() => {
    if (!context.open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    if (context.modal) {
      document.body.style.overflow = 'hidden';
    }

    window.requestAnimationFrame(() => {
      const content = context.contentRef.current;
      if (!content) {
        return;
      }

      const [firstFocusable] = getFocusableElements(content);
      (firstFocusable ?? content).focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      const restoreTarget = context.previousActiveElementRef.current ?? context.triggerRef.current;
      window.requestAnimationFrame(() => restoreTarget?.focus());
    };
  }, [
    context.contentRef,
    context.modal,
    context.open,
    context.previousActiveElementRef,
    context.triggerRef,
  ]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        context.setOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const content = context.contentRef.current;
      if (!content) {
        return;
      }

      const focusableElements = getFocusableElements(content);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        content.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [context],
  );

  if (!context.open) {
    return null;
  }

  return (
    <div
      role={context.role}
      aria-modal={context.modal}
      aria-labelledby={labelledBy ?? context.titleId}
      aria-describedby={describedBy ?? context.descriptionId}
      id={context.contentId}
      data-slot='dialog-content'
      data-state={context.open ? 'open' : 'closed'}
      data-open={context.open ? '' : undefined}
      ref={context.contentRef}
      tabIndex={-1}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogTitle({ id, ...props }: React.ComponentProps<'h2'>) {
  const context = useDialogContext('DialogTitle');

  return <h2 id={id ?? context.titleId} data-slot='dialog-title' {...props} />;
}

function DialogDescription({ id, ...props }: React.ComponentProps<'p'>) {
  const context = useDialogContext('DialogDescription');

  return <p id={id ?? context.descriptionId} data-slot='dialog-description' {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
export type { DialogProps, DialogTriggerProps, DialogCloseProps, DialogContentProps };
