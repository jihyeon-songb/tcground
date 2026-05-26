import * as React from 'react';
import { createPortal } from 'react-dom';

import {
  composeEventHandlers,
  cx,
  getFocusableElements,
  useControllableState,
} from '../utils/compose';

interface DialogContextValue {
  contentId: string;
  descriptionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  setTriggerNode: (node: HTMLButtonElement | null) => void;
  titleId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(componentName: string) {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error(`${componentName} must be used inside Dialog.Root.`);
  }

  return context;
}

export interface DialogRootProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function DialogRoot({ children, defaultOpen = false, onOpenChange, open }: DialogRootProps) {
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const generatedId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const setTriggerNode = React.useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);

  const context = React.useMemo<DialogContextValue>(
    () => ({
      contentId: `${generatedId}-content`,
      descriptionId: `${generatedId}-description`,
      open: currentOpen,
      setOpen: setCurrentOpen,
      setTriggerNode,
      titleId: `${generatedId}-title`,
      triggerRef,
    }),
    [currentOpen, generatedId, setCurrentOpen, setTriggerNode],
  );

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ asChild = false, children, onClick, ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Trigger');
    const setTriggerRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        context.setTriggerNode(node);

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [context, forwardedRef],
    );
    const triggerProps = {
      'aria-controls': context.contentId,
      'aria-expanded': context.open,
      onClick: composeEventHandlers(onClick, () => context.setOpen(true)),
    };

    if (asChild) {
      if (!React.isValidElement(children)) {
        throw new Error('Dialog.Trigger with asChild expects a single valid React element child.');
      }

      const child = children as React.ReactElement<
        React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }
      >;

      return React.cloneElement(child, {
        ...props,
        ...triggerProps,
        ref: setTriggerRefs,
      });
    }

    return (
      <button
        {...props}
        {...triggerProps}
        ref={setTriggerRefs}
        type={props.type ?? 'button'}
      >
        {children}
      </button>
    );
  },
);

export interface DialogPortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, container ?? document.body);
}

export function DialogOverlay({
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = useDialogContext('Dialog.Overlay');

  if (!context.open) {
    return null;
  }

  return (
    <DialogPortal>
      <div
        {...props}
        className={cx('pui-dialog-overlay', className)}
        onClick={composeEventHandlers(onClick, () => context.setOpen(false))}
      />
    </DialogPortal>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  describedBy?: string;
  labelledBy?: string;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    { children, className, describedBy, labelledBy, onKeyDown, ...props },
    forwardedRef,
  ) {
    const context = useDialogContext('Dialog.Content');
    const contentRef = React.useRef<HTMLDivElement>(null);
    const setContentRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      if (!context.open) {
        return;
      }

      const previouslyFocused = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      window.setTimeout(() => {
        const focusableElements = contentRef.current
          ? getFocusableElements(contentRef.current)
          : [];
        (focusableElements[0] ?? contentRef.current)?.focus();
      }, 0);

      return () => {
        document.body.style.overflow = previousOverflow;
        if (previouslyFocused instanceof HTMLElement) {
          previouslyFocused.focus();
        } else {
          context.triggerRef.current?.focus();
        }
      };
    }, [context.open, context.triggerRef]);

    if (!context.open) {
      return null;
    }

    return (
      <DialogPortal>
        <div
          {...props}
          aria-describedby={describedBy ?? context.descriptionId}
          aria-labelledby={labelledBy ?? context.titleId}
          aria-modal='true'
          className={cx('pui-dialog-content', className)}
          id={context.contentId}
          onKeyDown={(event) => {
            onKeyDown?.(event);

            if (event.defaultPrevented) {
              return;
            }

            if (event.key === 'Escape') {
              context.setOpen(false);
              return;
            }

            if (event.key !== 'Tab' || !contentRef.current) {
              return;
            }

            const focusableElements = getFocusableElements(contentRef.current);
            if (focusableElements.length === 0) {
              event.preventDefault();
              contentRef.current.focus();
              return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }}
          ref={setContentRefs}
          role='dialog'
          tabIndex={-1}
        >
          {children}
        </div>
      </DialogPortal>
    );
  },
);

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ asChild = false, children, onClick, ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Close');
    const closeProps = {
      onClick: composeEventHandlers(onClick, () => context.setOpen(false)),
    };

    if (asChild) {
      if (!React.isValidElement(children)) {
        throw new Error('Dialog.Close with asChild expects a single valid React element child.');
      }

      const child = children as React.ReactElement<
        React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }
      >;

      return React.cloneElement(child, {
        ...props,
        ...closeProps,
        ref: forwardedRef,
      });
    }

    return (
      <button {...props} {...closeProps} ref={forwardedRef} type={props.type ?? 'button'}>
        {children}
      </button>
    );
  },
);

export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = useDialogContext('Dialog.Title');

  return <h2 {...props} id={props.id ?? context.titleId} />;
}

export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const context = useDialogContext('Dialog.Description');

  return <p {...props} id={props.id ?? context.descriptionId} />;
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Close: DialogClose,
  Title: DialogTitle,
  Description: DialogDescription,
};
