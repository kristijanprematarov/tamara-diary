import { Injectable, signal } from '@angular/core';

export type Currency = 'EUR' | 'MKD';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  // Base is EUR; static rate to MKD
  private readonly EUR_TO_MKD = 61.5;
  private readonly STORAGE_KEY = 'TD_CURRENCY_V1';

  current = signal<Currency>('EUR');

  constructor() {
    const saved = (localStorage.getItem(this.STORAGE_KEY) as Currency | null) || null;
    if (saved === 'EUR' || saved === 'MKD') this.current.set(saved);
  }

  set(c: Currency) {
    this.current.set(c);
    localStorage.setItem(this.STORAGE_KEY, c);
  }

  toggle() {
    this.set(this.current() === 'EUR' ? 'MKD' : 'EUR');
  }

  convertFromBaseEur(amountEur: number): number {
    return this.current() === 'MKD' ? amountEur * this.EUR_TO_MKD : amountEur;
  }

  format(amountEur: number): string {
    if (this.current() === 'EUR') return `€${amountEur.toFixed(0)}`;
    const den = Math.round(amountEur * this.EUR_TO_MKD);
    return `${den} ден.`;
  }
}
