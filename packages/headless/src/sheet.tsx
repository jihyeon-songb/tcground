// A sheet is a Dialog that slides in from an edge of the viewport. Behavior
// (portal, focus trap, Escape/overlay dismiss, focus restore) is identical to
// Dialog; the edge placement is purely a styling concern in the consumer.
export {
  Dialog as Sheet,
  DialogTrigger as SheetTrigger,
  DialogClose as SheetClose,
  DialogPortal as SheetPortal,
  DialogOverlay as SheetOverlay,
  DialogContent as SheetContent,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
} from './dialog.js';
export type { DialogProps as SheetProps } from './dialog.js';
