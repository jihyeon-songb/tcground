import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tcground/ui';

const rows = [
  { name: '리자몽 ex 151 SAR', set: '한국판 SV2a', price: '420,000원', change: '+12%' },
  { name: '피카츄 ex SAR', set: '한국판 SV5K', price: '95,000원', change: '+3%' },
  { name: '뮤츠 V ALT', set: '한국판 SWSH', price: '180,000원', change: '-1%' },
];

export default function DefaultExample() {
  return (
    <Table>
      <TableCaption>최근 거래가 기준 상위 카드</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>카드</TableHead>
          <TableHead>세트</TableHead>
          <TableHead>평균가</TableHead>
          <TableHead style={{ textAlign: 'right' }}>변동</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>{row.set}</TableCell>
            <TableCell>{row.price}</TableCell>
            <TableCell style={{ textAlign: 'right' }}>{row.change}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
