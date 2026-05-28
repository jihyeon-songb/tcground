import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@tcground/ui';

export default function PriceExample() {
  return (
    <InputGroup style={{ width: 'min(100%, 16rem)' }}>
      <InputGroupAddon>
        <InputGroupText>₩</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput inputMode='numeric' placeholder='0' />
    </InputGroup>
  );
}
