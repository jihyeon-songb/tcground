import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@tcground/ui';

export default function SuffixButtonExample() {
  return (
    <InputGroup style={{ width: 'min(100%, 22rem)' }}>
      <InputGroupAddon>
        <span aria-hidden='true'>@</span>
      </InputGroupAddon>
      <InputGroupInput placeholder='이메일 주소' />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton variant='default'>등록</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
