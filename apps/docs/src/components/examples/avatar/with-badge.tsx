import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@tcground/ui';

export default function WithBadgeExample() {
  return (
    <Avatar>
      <AvatarImage src='https://i.pravatar.cc/64?img=5' alt='사용자' />
      <AvatarFallback>SH</AvatarFallback>
      <AvatarBadge style={{ background: '#10b981' }} />
    </Avatar>
  );
}
