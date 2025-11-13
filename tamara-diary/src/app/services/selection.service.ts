import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private storageKey = 'td:selectedCards';
  private subj = new BehaviorSubject<string[]>(this.load());

  changes() { return this.subj.asObservable(); }
  current() { return this.subj.getValue(); }

  private load(): string[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private save(list: string[]){
    try{ localStorage.setItem(this.storageKey, JSON.stringify(list)); }catch{}
    this.subj.next(list.slice());
  }

  set(list: string[]){ this.save(Array.from(new Set(list))); }
  add(id: string){ const cur = this.current(); if (!cur.includes(id)) cur.push(id); this.save(cur); }
  remove(id: string){ const cur = this.current().filter(x=>x!==id); this.save(cur); }
  toggle(id: string){ const cur = this.current(); if (cur.includes(id)) this.remove(id); else this.add(id); }
  clear(){ this.save([]); }
}
