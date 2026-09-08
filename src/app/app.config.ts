import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { TranslationService } from './services/translation';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    provideAppInitializer(() => {
      const translationService = inject(TranslationService);
      return translationService.init();
    })
  ]
};