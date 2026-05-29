import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tcground/ui';

export default function DefaultExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>평균가</Button>
        </TooltipTrigger>
        <TooltipContent>최근 30일 실거래가 기준</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
