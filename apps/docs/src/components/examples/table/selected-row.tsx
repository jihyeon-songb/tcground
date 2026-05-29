import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tcground/ui';

export default function SelectedRowExample() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>카드</TableHead>
          <TableHead>상태</TableHead>
          <TableHead style={{ textAlign: 'right' }}>표본 수</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow data-state='selected'>
          <TableCell>리자몽 ex 151 SAR</TableCell>
          <TableCell>관심 카드</TableCell>
          <TableCell style={{ textAlign: 'right' }}>18</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>뮤 ex 151 SAR</TableCell>
          <TableCell>일반</TableCell>
          <TableCell style={{ textAlign: 'right' }}>11</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
