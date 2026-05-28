import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@tcground/ui';

export default function BasicExample() {
  return (
    <Select>
      <SelectTrigger style={{ width: '14rem' }}>
        <SelectValue placeholder='카테고리 선택' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>TCG</SelectLabel>
          <SelectItem value='pokemon'>포켓몬</SelectItem>
          <SelectItem value='magic'>매직: 더 개더링</SelectItem>
          <SelectItem value='yugioh'>유희왕</SelectItem>
          <SelectItem value='one-piece'>원피스 카드</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>옵션</SelectLabel>
          <SelectItem value='all'>전체 보기</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
