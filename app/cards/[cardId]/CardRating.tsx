'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import type { CardRatingSummary } from '@/lib/tcg-catalog';
import { formatRating } from '@/lib/tcg-data';
import { submitCardRating } from './_actions/rate-card';
import { RATING_STARS, ratingCountLabel, starFills } from './card-rating';

interface CardRatingProps {
  cardId: string;
  slug: string;
  summary: CardRatingSummary;
  viewerRating: number | null;
  isAuthenticated: boolean;
}

/** A filled star clipped to `fill` (0–1) so averages can show partial stars. */
function Star({ fill, className }: { fill: number; className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox='0 0 24 24' className={className} aria-hidden focusable='false'>
      <defs>
        <clipPath id={clipId}>
          <rect x='0' y='0' width={`${Math.max(0, Math.min(1, fill)) * 24}`} height='24' />
        </clipPath>
      </defs>
      <path
        d='M12 2l2.9 6.26L21.8 9.27l-5 4.87 1.18 6.88L12 17.77l-5.98 3.25L7.2 14.14l-5-4.87 6.9-1.01L12 2z'
        fill='#e6e8ea'
      />
      <path
        d='M12 2l2.9 6.26L21.8 9.27l-5 4.87 1.18 6.88L12 17.77l-5.98 3.25L7.2 14.14l-5-4.87 6.9-1.01L12 2z'
        fill='#f5a623'
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

/**
 * Card rating block: shows the public average as partially filled stars, plus an
 * interactive 1–5 input for signed-in users (or a sign-in prompt otherwise).
 */
export function CardRating({
  cardId,
  slug,
  summary,
  viewerRating,
  isAuthenticated,
}: CardRatingProps) {
  const [selected, setSelected] = useState<number | null>(viewerRating);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fills = starFills(summary.average);
  const activeInput = hover ?? selected ?? 0;

  function rate(score: number) {
    setError(null);
    setSelected(score);
    startTransition(async () => {
      const result = await submitCardRating({ cardId, slug, score });
      if (!result.ok) {
        setSelected(viewerRating);
        setError(result.error);
      }
    });
  }

  return (
    <section
      aria-labelledby='card-rating-heading'
      className='flex flex-col gap-4 rounded-2xl bg-white p-8'
    >
      <h3
        id='card-rating-heading'
        className='text-sm leading-none font-semibold tracking-wider text-[#535f73] uppercase'
      >
        사용자 평점
      </h3>

      <div className='flex flex-wrap items-center gap-4'>
        <span className='text-4xl leading-[1.1] font-extrabold text-[#191c1e] tabular-nums'>
          {formatRating(summary.average)}
        </span>
        <div className='flex items-center gap-1' aria-hidden>
          {fills.map((fill, index) => (
            <Star key={index} fill={fill} className='h-6 w-6' />
          ))}
        </div>
        <span className='text-base text-[#535f73]'>{ratingCountLabel(summary)}</span>
      </div>

      <div className='border-t border-[#e6e8ea] pt-4'>
        {isAuthenticated ? (
          <div className='flex flex-col gap-2'>
            <span className='text-sm font-semibold text-[#535f73]'>
              {selected ? '내 평점' : '이 카드를 평가해 주세요'}
            </span>
            <div
              className='flex items-center gap-1'
              role='radiogroup'
              aria-label='카드 평점 선택'
              onMouseLeave={() => setHover(null)}
            >
              {RATING_STARS.map((score) => (
                <button
                  key={score}
                  type='button'
                  role='radio'
                  aria-checked={selected === score}
                  aria-label={`${score}점`}
                  disabled={isPending}
                  onMouseEnter={() => setHover(score)}
                  onFocus={() => setHover(score)}
                  onBlur={() => setHover(null)}
                  onClick={() => rate(score)}
                  className='rounded-md p-1 transition-transform hover:scale-110 disabled:opacity-50'
                >
                  <Star fill={score <= activeInput ? 1 : 0} className='h-8 w-8' />
                </button>
              ))}
            </div>
            {error ? (
              <p role='alert' className='text-sm text-[#c62828]'>
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <p className='text-sm text-[#535f73]'>
            평점을 남기려면{' '}
            <Link
              href={`/login?next=/cards/${slug}`}
              className='font-semibold text-[#bb001a] underline hover:text-[#8f0014]'
            >
              로그인
            </Link>
            하세요.
          </p>
        )}
      </div>
    </section>
  );
}
