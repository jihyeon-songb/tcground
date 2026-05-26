import {Button, Dialog} from '@tcground/headless-ui';

export default function BasicExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="pui-button" data-variant="primary" data-size="md">
        다이얼로그 열기
      </Dialog.Trigger>
      <Dialog.Overlay />
      <Dialog.Content>
        <Dialog.Title style={{margin: '0 0 0.5rem'}}>관심 카드에 추가</Dialog.Title>
        <Dialog.Description style={{margin: '0 0 1.25rem'}}>
          선택한 카드를 관심 목록에 저장합니다. 언제든 다시 해제할 수 있습니다.
        </Dialog.Description>
        <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
          <Dialog.Close asChild>
            <Button variant="ghost">취소</Button>
          </Dialog.Close>
          <Dialog.Close asChild>
            <Button>저장</Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
