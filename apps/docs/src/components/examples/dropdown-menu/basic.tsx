import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@tcground/ui';

export default function BasicExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline'>옵션 열기</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>카드 작업</DropdownMenuLabel>
        <DropdownMenuItem>
          상세 보기 <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          덱에 추가 <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>관심 카드에 저장</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive'>관심 목록에서 제거</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
