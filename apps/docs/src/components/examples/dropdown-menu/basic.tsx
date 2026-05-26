import {DropdownMenu} from '@tcground/headless-ui';

export default function BasicExample() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="pui-button" data-variant="primary" data-size="md">
        메뉴 열기
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item>상세 보기</DropdownMenu.Item>
        <DropdownMenu.Item>덱에 추가</DropdownMenu.Item>
        <DropdownMenu.Item>관심 카드에 저장</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
