import {Toggle} from '@tcground/headless-ui';

export default function DefaultPressedExample() {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
      <Toggle defaultPressed>굵게</Toggle>
      <Toggle>기울임</Toggle>
      <Toggle>밑줄</Toggle>
    </div>
  );
}
