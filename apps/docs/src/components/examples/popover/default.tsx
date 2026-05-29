import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tcground/ui';

export default function DefaultExample() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>가격 알림</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>가격 알림</PopoverTitle>
          <PopoverDescription>
            관심 카드의 평균가가 10% 이상 변동하면 알림을 보냅니다.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
