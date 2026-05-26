import {Button, Dialog} from '@tcground/headless-ui';

export default function AsChildTriggerExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Button 컴포넌트로 트리거</Button>
      </Dialog.Trigger>
      <Dialog.Overlay />
      <Dialog.Content>
        <Dialog.Title style={{margin: '0 0 0.5rem'}}>asChild 트리거</Dialog.Title>
        <Dialog.Description style={{margin: '0 0 1.25rem'}}>
          Dialog.Trigger 가 자식 요소에 aria 와 onClick 을 머지합니다.
        </Dialog.Description>
        <Dialog.Close asChild>
          <Button>확인</Button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}
