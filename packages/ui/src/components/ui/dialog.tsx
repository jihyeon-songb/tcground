'use client';

/* eslint-disable react-hooks/refs -- Dialog is a focus-management primitive that must wire and read DOM refs in event handlers/effects. */

import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils';
import { Button } from './button';
import { composeEventHandlers, composeRefs, PrimitiveSlot } from './primitive';
import { XIcon } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface DialogContextValue {
  contentId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  descriptionId: string;
  modal: boolean;
  open: boolean;
  previousActiveElementRef: React.RefObject<HTMLElement | null>;
  rememberActiveElement: (element: HTMLElement | null) => void;
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
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

function Dialog({ children, defaultOpen = false, modal = true, onOpenChange, open }: DialogProps) {
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
        const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
        modal,
        open: currentOpen,
        previousActiveElementRef,
        rememberActiveElement,
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

function DialogOverlay({ className, onMouseDown, ...props }: React.ComponentProps<'div'>) {
  const context = useDialogContext('DialogOverlay');

  return (
    <div
      data-slot='dialog-overlay'
      className={cn(
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      data-state={context.open ? 'open' : 'closed'}
      data-open={context.open ? '' : undefined}
      onMouseDown={composeEventHandlers(onMouseDown, (event) => {
        if (event.target === event.currentTarget) {
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
  showCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  describedBy,
  labelledBy,
  onKeyDown,
  showCloseButton = true,
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
  }, [context.contentRef, context.modal, context.open, context.previousActiveElementRef, context.triggerRef]);

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
    <DialogPortal>
      <DialogOverlay />
      <div
        role='dialog'
        aria-modal={context.modal}
        aria-labelledby={labelledBy ?? context.titleId}
        aria-describedby={describedBy ?? context.descriptionId}
        id={context.contentId}
        data-slot='dialog-content'
        data-state={context.open ? 'open' : 'closed'}
        data-open={context.open ? '' : undefined}
        ref={context.contentRef}
        tabIndex={-1}
        className={cn(
          'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 text-sm ring-1 duration-100 outline-none sm:max-w-sm',
          className,
        )}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose asChild>
            <Button variant='ghost' className='absolute top-2 right-2' size='icon-sm'>
              <XIcon />
              <span className='sr-only'>Close</span>
            </Button>
          </DialogClose>
        )}
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot='dialog-header' className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        'bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant='outline'>Close</Button>
        </DialogClose>
      )}
    </div>
  );
}

function DialogTitle({ className, id, ...props }: React.ComponentProps<'h2'>) {
  const context = useDialogContext('DialogTitle');

  return (
    <h2
      id={id ?? context.titleId}
      data-slot='dialog-title'
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, id, ...props }: React.ComponentProps<'p'>) {
  const context = useDialogContext('DialogDescription');

  return (
    <p
      id={id ?? context.descriptionId}
      data-slot='dialog-description'
      className={cn(
        'text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
