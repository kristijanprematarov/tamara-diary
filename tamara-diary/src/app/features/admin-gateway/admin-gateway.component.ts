import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-gateway',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  template: `
    <div class="gateway-bg min-vh-100 d-flex align-items-center justify-content-center">
      <div class="gateway-card">
        <h2 class="mb-4 text-center">{{ 'adminGateway.title' | translate }}</h2>
        <form (submit)="submit()" class="gateway-form">
          <div class="input-wrap">
            <input type="password" [formControl]="passcode" class="gateway-input" [placeholder]="('adminGateway.placeholder' | translate)" required autofocus>
            <button class="gateway-btn" [disabled]="!passcode.value">{{ 'adminGateway.enter' | translate }}</button>
          </div>
        </form>
        <div *ngIf="error" class="gateway-error">{{ 'adminGateway.invalid' | translate }}</div>
      </div>
    </div>
  `,
  styles: [`
    .gateway-bg {
      /* Use the lighter site accent (keeps pages consistent with hero/other sections) */
      background: linear-gradient(180deg, var(--brand-accent, #ffe6f0), #fff);
      min-height: 100vh;
      /* avoid forcing full viewport width (prevents horizontal overflow when a left nav exists) */
      box-sizing: border-box;
      padding: 4rem 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-x: hidden;
    }
    .gateway-card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      padding: 2rem 2.25rem;
      max-width: 380px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      border: 1px solid rgba(0,0,0,0.04);
    }
    .gateway-input {
      font-size: 1.05rem;
      padding: .75rem 1rem;
      border-radius: 8px;
      border: 1px solid #e6dee6;
      margin-bottom: 0.25rem;
      outline: none;
      transition: border-color .2s, box-shadow .12s;
    }
    .gateway-input:focus {
      border-color: var(--brand-primary, #e37aa9);
      box-shadow: 0 6px 18px rgba(227,122,169,0.08);
    }
    /* form layout: input with overlapping small submit button */
    .gateway-form { display:flex; justify-content:center; }
    .input-wrap { position: relative; width: 100%; max-width: 320px; }
    .gateway-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      background: linear-gradient(90deg, var(--brand-primary-dark, #d66596) 0%, var(--brand-primary, #e37aa9) 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      width: 48px;
      height: 42px;
      padding: 0;
      font-weight: 700;
      box-shadow: 0 6px 18px rgba(0,0,0,0.12);
      cursor: pointer;
    }
    .gateway-btn:disabled { opacity: .6; cursor: not-allowed; }
    .gateway-input { padding-right: 5.5rem; }
    .gateway-error {
      color: var(--brand-primary-dark, #d66596);
      text-align: center;
      margin-top: 1rem;
      font-weight: 600;
    }
    @media (max-width: 600px){
      .gateway-card{ margin: 0 1rem; max-width: 92%; }
      .input-wrap{ max-width: 100%; }
      .gateway-btn{ right: 8px; }
    }
  `]
})
export class AdminGatewayComponent {
  passcode = new FormControl('');
  error = false;
  constructor(private router: Router) {}

  submit() {
    if (this.passcode.value === 'Strmosh3#') {
      localStorage.setItem('tamara-admin', 'true');
      this.router.navigate(['/admin']);
    } else {
      this.error = true;
    }
  }
}
