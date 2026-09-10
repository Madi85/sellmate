import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';

type ArticleImage = {
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
};

type Article = {
  id: string;
  title: string;
  brand: string | null;
  size: string | null;
  condition: string | null;
  status: string;
  purchase_price_cents: number | null;
  created_at: string;

  article_images: ArticleImage[];

  coverUrl?: string | null;
};
@Component({
  selector: 'app-articles',
  imports: [RouterLink],
  templateUrl: './articles.html',
  styleUrl: './articles.scss'
})
export class Articles implements OnInit {

  articles = signal<Article[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  constructor(
    private supabaseService: SupabaseService,
    private translationService: TranslationService
  ) { }

  ngOnInit(): void {
    this.loadArticles();
  }

  async loadArticles() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { data, error } = await this.supabaseService.client
        .from('articles')
        .select(`
        id,
        title,
        brand,
        size,
        condition,
        status,
        purchase_price_cents,
        created_at,
        article_images (
          storage_path,
          is_cover,
          sort_order
        )
      `)
        .order('created_at', { ascending: false });

      if (error) {
        this.errorMessage.set(error.message);
        return;
      }

      const articles: Article[] = data ?? [];

      for (const article of articles) {

        const coverImage =
          article.article_images
            ?.sort((a, b) => a.sort_order - b.sort_order)
            .find(image => image.is_cover)
          ??
          article.article_images?.[0];

        if (!coverImage) {
          article.coverUrl = null;
          continue;
        }

        const { data: signedUrlData, error: signedUrlError } =
          await this.supabaseService.client.storage
            .from('article-images')
            .createSignedUrl(
              coverImage.storage_path,
              60 * 60
            );

        if (signedUrlError) {
          console.error(
            'Cover konnte nicht geladen werden:',
            signedUrlError
          );

          article.coverUrl = null;
          continue;
        }

        article.coverUrl = signedUrlData.signedUrl;
      }

      this.articles.set(articles);

    } catch (error) {
      console.error('Fehler beim Laden der Artikel:', error);

      this.errorMessage.set(
        'Artikel konnten nicht geladen werden.'
      );

    } finally {
      this.loading.set(false);
    }
  }
  t(key: string): string {
    return this.translationService.t(key);
  }
  formatPrice(cents: number | null): string {
    if (cents === null) {
      return '–';
    }

    const localeMap = {
      de: 'de-DE',
      en: 'en-GB',
      ar: 'ar-SA'
    };

    const language =
      this.translationService.language();

    const locale =
      localeMap[language];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  }
  getConditionLabel(condition: string | null): string {
    switch (condition) {
      case 'new':
        return this.t('conditionNew');

      case 'like_new':
        return this.t('conditionLikeNew');

      case 'very_good':
        return this.t('conditionVeryGood');

      case 'good':
        return this.t('conditionGood');

      case 'satisfactory':
        return this.t('conditionSatisfactory');

      default:
        return '–';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft':
        return this.t('statusDraft');

      case 'published':
        return this.t('statusPublished');

      case 'sold':
        return this.t('statusSold');

      default:
        return status;
    }
  }
}