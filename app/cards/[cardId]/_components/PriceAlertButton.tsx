'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@tcground/ui';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setPriceAlert, clearPriceAlert } from '../_actions/price-alert';

type Direction = 'below' | 'above';

interface ExistingAlert {
  direction: Direction;
  threshold: number;
}

interface Props {
  cardPrintingId: string;
  slug: string;
  currency: string;
  gradeLabel: string | null;
  isAuthenticated: boolean;
  existingAlert: ExistingAlert | null;
}

export function PriceAlertButton({
  cardPrintingId,
  slug,
  currency,
  gradeLabel,
  isAuthenticated,
  existingAlert,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>(existingAlert?.direction ?? 'below');
  const [threshold, setThreshold] = useState(existingAlert ? String(existingAlert.threshold) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button
        type='button'
        variant='outline'
        size='cta'
        onClick={() => router.push(`/login?redirect=/cards/${slug}`)}
      >
        <Bell className='size-5' aria-hidden /> 가격 알림 설정
      </Button>
    );
  }

  const label = existingAlert ? '알림 설정됨' : '가격 알림 설정';

  function submit() {
    setError(null);
    const n = Number(threshold);
    startTransition(async () => {
      const res = await setPriceAlert({
        cardPrintingId,
        slug,
        currency,
        gradeLabel,
        direction,
        threshold: n,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      const res = await clearPriceAlert({ cardPrintingId, slug, direction: existingAlert!.direction });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant={existingAlert ? 'default' : 'outline'} size='cta'>
          <Bell className='size-5' aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>가격 알림{gradeLabel ? ` · ${gradeLabel}` : ''}</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <RadioGroup value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='below' id='dir-below' />
              <Label htmlFor='dir-below'>이 가격 이하로 떨어지면</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='above' id='dir-above' />
              <Label htmlFor='dir-above'>이 가격 이상으로 오르면</Label>
            </div>
          </RadioGroup>
          <div className='flex flex-col gap-1'>
            <Label htmlFor='threshold'>목표가 ({currency})</Label>
            <Input
              id='threshold'
              type='number'
              inputMode='numeric'
              min='1'
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          {error && <p className='text-tcg-red text-sm'>{error}</p>}
          <div className='flex gap-2'>
            <Button type='button' onClick={submit} disabled={pending || !threshold}>
              {existingAlert ? '알림 수정' : '알림 설정'}
            </Button>
            {existingAlert && (
              <Button type='button' variant='outline' onClick={clear} disabled={pending}>
                알림 해제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
