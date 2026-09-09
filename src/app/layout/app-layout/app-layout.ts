import { Component } from '@angular/core';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayout {

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private translationService: TranslationService
  ) { }

  t(key: string): string {
    return this.translationService.t(key);
  }

  async logout() {
    await this.supabaseService.signOut();
    await this.router.navigate(['/login']);
  }

  setLanguage(language: 'de' | 'en' | 'ar') {
    this.translationService.loadLanguage(language);
  }

  get currentLanguage() {
    return this.translationService.language();
  }
}