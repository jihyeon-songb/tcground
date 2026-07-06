export type AlertDirection = 'below' | 'above';

export interface ActiveAlert {
  id: string;
  userId: string;
  cardPrintingId: string;
  currency: string;
  gradeLabel: string | null;
  direction: AlertDirection;
  threshold: number;
}

export interface AlertHit {
  alert: ActiveAlert;
  currentPrice: number;
}
