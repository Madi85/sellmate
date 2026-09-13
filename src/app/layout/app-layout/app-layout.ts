import { Component, signal } from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';

@Component({
  selector: 'app-app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayout {

  isDarkMode = signal(false);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private translationService: TranslationService
  ) {
    this.initTheme();
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  async logout(): Promise<void> {
    await this.supabaseService.signOut();
    await this.router.navigate(['/login']);
  }

  setLanguage(language: 'de' | 'en' | 'ar'): void {
    this.translationService.loadLanguage(language);
  }

  get currentLanguage() {
    return this.translationService.language();
  }

  toggleTheme(): void {
    const darkMode = !this.isDarkMode();

    this.isDarkMode.set(darkMode);

    this.applyTheme(darkMode);

    localStorage.setItem(
      'theme',
      darkMode ? 'dark' : 'light'
    );
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      this.applyTheme(true);
      return;
    }

    if (savedTheme === 'light') {
      this.isDarkMode.set(false);
      this.applyTheme(false);
      return;
    }

    const prefersDarkMode =
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.isDarkMode.set(prefersDarkMode);
    this.applyTheme(prefersDarkMode);
  }

  private applyTheme(darkMode: boolean): void {
    document.documentElement.classList.toggle(
      'dark-theme',
      darkMode
    );
  }

}