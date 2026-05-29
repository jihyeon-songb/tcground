import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tcground/ui';

export default function WithActionsExample() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>필터 요약</Button>
      </PopoverTrigger>
      <PopoverContent align='start'>
        <PopoverHeader>
          <PopoverTitle>현재 필터</PopoverTitle>
          <PopoverDescription>포켓몬, 한국판, 최근 30일 거래가 기준입니다.</PopoverDescription>
        </PopoverHeader>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant='ghost' size='sm'>
            초기화
          </Button>
          <Button size='sm'>적용</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
