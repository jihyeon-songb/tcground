import { Avatar, AvatarFallback } from '@tcground/ui';

export default function FallbackSizesExample() {
  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
      <Avatar size='sm'>
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar size='lg'>
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    </div>
  );
}
