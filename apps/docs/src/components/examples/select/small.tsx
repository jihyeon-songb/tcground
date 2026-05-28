import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tcground/ui';

export default function SmallExample() {
  return (
    <Select>
      <SelectTrigger size='sm' style={{ width: '10rem' }}>
        <SelectValue placeholder='정렬' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='recent'>최신순</SelectItem>
        <SelectItem value='price-asc'>가격 낮은순</SelectItem>
        <SelectItem value='price-desc'>가격 높은순</SelectItem>
      </SelectContent>
    </Select>
  );
}
