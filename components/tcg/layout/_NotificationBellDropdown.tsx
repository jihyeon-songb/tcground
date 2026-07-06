'use client';

import { startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tcground/ui';
import { markAllNotificationsRead } from '@/app/notifications/_actions/mark-read';

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  card_slug: string | null;
}

interface Props {
  rows: NotificationRow[];
  unread: number;
}

export function NotificationBellDropdown({ rows, unread }: Props) {
  const router = useRouter();

  function handleOpenChange(open: boolean) {
    if (open && unread > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
        router.refresh();
      });
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className='relative inline-flex size-9 items-center justify-center'>
        <Bell className='size-5' aria-hidden />
        {unread > 0 && (
          <span className='bg-tcg-red text-primary-foreground absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span className='sr-only'>알림 {unread}건</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80'>
        {rows.length === 0 ? (
          <DropdownMenuItem disabled>알림이 없습니다.</DropdownMenuItem>
        ) : (
          rows.map((r) =>
            r.card_slug ? (
              <DropdownMenuItem key={r.id} asChild className={r.read_at ? 'opacity-60' : 'font-semibold'}>
                <Link href={`/cards/${r.card_slug}`} className='flex w-full flex-col'>
                  <span>{r.title}</span>
                  <span className='text-muted-foreground text-xs'>{r.body}</span>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={r.id} className={r.read_at ? 'opacity-60' : 'font-semibold'}>
                <span className='flex flex-col'>
                  <span>{r.title}</span>
                  <span className='text-muted-foreground text-xs'>{r.body}</span>
                </span>
              </DropdownMenuItem>
            )
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
