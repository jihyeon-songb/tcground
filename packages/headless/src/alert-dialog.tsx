'use client';

import * as React from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  type DialogProps,
} from './dialog';

type AlertDialogProps = Omit<DialogProps, 'role' | 'dismissOnOverlayClick'>;

// An alert dialog is a modal dialog that interrupts the user; it must not be
// dismissed by clicking the overlay (Escape still closes it).
function AlertDialog(props: AlertDialogProps) {
  return <Dialog role='alertdialog' dismissOnOverlayClick={false} {...props} />;
}

export {
  AlertDialog,
  DialogTrigger as AlertDialogTrigger,
  DialogPortal as AlertDialogPortal,
  DialogOverlay as AlertDialogOverlay,
  DialogContent as AlertDialogContent,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
  DialogClose as AlertDialogAction,
  DialogClose as AlertDialogCancel,
};
export type { AlertDialogProps };
