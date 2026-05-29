import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tcground/ui';

export default function ShortcutExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='ghost'>검색</Button>
        </TooltipTrigger>
        <TooltipContent>
          카드 검색 <kbd data-slot='kbd'>⌘K</kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
