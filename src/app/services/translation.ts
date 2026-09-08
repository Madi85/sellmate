import { Injectable, signal } from '@angular/core';

export type Language = 'de' | 'en' | 'ar';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {

    language = signal<Language>('de');

    private translations: Record<string, string> = {};

    async loadLanguage(language: Language): Promise<void> {
        try {
            const response = await fetch(`/i18n/${language}.json`);

            if (!response.ok) {
                throw new Error(`Übersetzungen konnten nicht geladen werden: ${language}`);
            }

            this.translations = await response.json();
            this.language.set(language);

            document.documentElement.lang = language;
            document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

            localStorage.setItem('language', language);

        } catch (error) {
            console.error('Fehler beim Laden der Übersetzungen:', error);
        }
    }

    t(key: string): string {
        return this.translations[key] ?? key;
    }

    async init(): Promise<void> {
        const savedLanguage = localStorage.getItem('language');

        let language: Language;

        if (
            savedLanguage === 'de' ||
            savedLanguage === 'en' ||
            savedLanguage === 'ar'
        ) {
            language = savedLanguage;
        } else {
            const browserLanguage = navigator.language
                .split('-')[0]
                .toLowerCase();

            if (
                browserLanguage === 'de' ||
                browserLanguage === 'en' ||
                browserLanguage === 'ar'
            ) {
                language = browserLanguage;
            } else {
                language = 'en';
            }
        }

        await this.loadLanguage(language);
    }
}