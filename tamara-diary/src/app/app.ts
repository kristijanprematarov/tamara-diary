import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyService, Currency } from './services/currency.service';
import { LoadingComponent } from './shared/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, LoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('tamara-diary');
  // mobile menu state: when true the top/hamburger menu is open on small screens
  menuOpen = signal(false);
  constructor(private i18n: TranslateService, private currencySvc: CurrencyService){
    i18n.addLangs(['en','mk']);
    // Ensure Macedonian is the default language
    i18n.setDefaultLang('mk');
    const saved = localStorage.getItem('TD_LANG_V1') || 'mk';
    i18n.use(saved);
     // Set currency based on language: EN => EUR, MK => MKD
     const initialCurrency = saved === 'en' ? 'EUR' : 'MKD';
     this.currencySvc.set(initialCurrency);
  }
  get currentLang(){ return this.i18n.currentLang; }
  setLang(l: 'en'|'mk'){
    this.i18n.use(l);
    localStorage.setItem('TD_LANG_V1', l);
      // Mirror language to currency automatically
      this.currencySvc.set(l === 'en' ? 'EUR' : 'MKD');
  }
  toggleMenu(){ this.menuOpen.update(v => !v); }
  
  closeMenu(){ this.menuOpen.set(false); }
  get currency(){ return this.currencySvc.current(); }
  setCurrency(c: Currency){ this.currencySvc.set(c); }
}
