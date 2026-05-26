import {DropdownMenu} from '@tcground/headless-ui';

export default function DisabledItemExample() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="pui-button" data-variant="secondary" data-size="md">
        편집
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item>복사</DropdownMenu.Item>
        <DropdownMenu.Item disabled>잘라내기 (비활성)</DropdownMenu.Item>
        <DropdownMenu.Item>붙여넣기</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
