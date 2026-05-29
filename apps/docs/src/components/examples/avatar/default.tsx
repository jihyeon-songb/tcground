import { Avatar, AvatarFallback, AvatarImage } from '@tcground/ui';

export default function DefaultExample() {
  return (
    <Avatar>
      <AvatarImage src='https://i.pravatar.cc/64?img=12' alt='사용자' />
      <AvatarFallback>JH</AvatarFallback>
    </Avatar>
  );
}
