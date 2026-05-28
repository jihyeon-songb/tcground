import { InputGroup, InputGroupAddon, InputGroupInput } from '@tcground/ui';

export default function SearchExample() {
  return (
    <InputGroup style={{ width: 'min(100%, 22rem)' }}>
      <InputGroupAddon>
        <span aria-hidden='true'>⌕</span>
      </InputGroupAddon>
      <InputGroupInput placeholder='카드 검색' />
    </InputGroup>
  );
}
