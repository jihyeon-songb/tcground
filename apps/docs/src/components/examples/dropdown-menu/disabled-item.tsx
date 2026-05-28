import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tcground/ui';

export default function DisabledItemExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='secondary'>편집</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>복사</DropdownMenuItem>
        <DropdownMenuItem disabled>잘라내기 (비활성)</DropdownMenuItem>
        <DropdownMenuItem>붙여넣기</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
