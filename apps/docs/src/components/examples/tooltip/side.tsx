import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tcground/ui';

export default function SideExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>표본 수</Button>
        </TooltipTrigger>
        <TooltipContent side='right' sideOffset={8}>
          이상치 제거 후 남은 거래 건수입니다.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
