import { Resend } from 'resend';
import type { AlertDirection } from './types';

interface SendInput {
  to: string;
  cardName: string;
  direction: AlertDirection;
  threshold: number;
  currentPrice: number;
  currency: string;
  cardUrl: string;
}

function fmt(n: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(n);
}

/** 가격 알림 이메일 1건 발송. 실패해도 throw하지 않고 { ok:false } 반환. */
export async function sendPriceAlertEmail(input: SendInput): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRICE_ALERT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[price-alert] RESEND_API_KEY/PRICE_ALERT_FROM_EMAIL 미설정 — 이메일 스킵');
    return { ok: false };
  }

  try {
    const dirText = input.direction === 'below' ? '이하로 떨어졌어요' : '이상으로 올랐어요';
    const subject = `[TCGround] ${input.cardName} 가격 알림`;
    const html = `
      <p><strong>${input.cardName}</strong> 시세가 설정하신 목표가 ${dirText}.</p>
      <ul>
        <li>목표가: ${fmt(input.threshold, input.currency)} (${input.direction === 'below' ? '이하' : '이상'})</li>
        <li>현재가: ${fmt(input.currentPrice, input.currency)}</li>
      </ul>
      <p><a href="${encodeURI(input.cardUrl)}">카드 상세 보기</a></p>
    `;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: input.to, subject, html });
    if (error) {
      console.warn('[price-alert] Resend 발송 실패', error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[price-alert] 이메일 발송 중 예외', err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
