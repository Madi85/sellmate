import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';

import {
  getCategoryTranslationKey,
  getConditionTranslationKey,
  getStatusTranslationKey
} from '../../shared/article-options';

type ArticleImage = {
  id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  url?: string;
};

type Article = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  size: string | null;
  condition: string | null;
  purchase_price_cents: number | null;
  sale_price_cents: number | null;
  status: string;
  article_images: ArticleImage[];
};

@Component({
  selector: 'app-article-detail',
  imports: [RouterLink],
  templateUrl: './article-detail.html',
  styleUrl: './article-detail.scss'
})
export class ArticleDetail implements OnInit {

  article = signal<Article | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  selectedImageUrl = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private translationService: TranslationService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      await this.router.navigate(['/articles']);
      return;
    }

    await this.loadArticle(id);
  }

  async loadArticle(id: string) {
    this.loading.set(true);
    this.errorMessage.set('');

    try {

      const { data, error } = await this.supabaseService.client
        .from('articles')
        .select(`
          id,
          title,
          description,
          category,
          brand,
          size,
          condition,
          purchase_price_cents,
          sale_price_cents,
          status,
          article_images (
            id,
            storage_path,
            sort_order,
            is_cover
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        this.errorMessage.set(error.message);
        return;
      }

      const article = data as Article;

      article.article_images.sort(
        (a, b) => a.sort_order - b.sort_order
      );

      for (const image of article.article_images) {

        const { data: signedData, error: signedError } =
          await this.supabaseService.client.storage
            .from('article-images')
            .createSignedUrl(
              image.storage_path,
              60 * 60
            );

        if (!signedError) {
          image.url = signedData.signedUrl;
        }
      }

      this.article.set(article);

      const cover =
        article.article_images.find(
          image => image.is_cover && image.url
        ) ??
        article.article_images.find(
          image => image.url
        );

      this.selectedImageUrl.set(
        cover?.url ?? null
      );

    } catch (error) {

      console.error(
        'Fehler beim Laden des Artikels:',
        error
      );

      this.errorMessage.set(
        'Artikel konnte nicht geladen werden.'
      );

    } finally {
      this.loading.set(false);
    }
  }

  selectImage(url: string | undefined) {
    if (url) {
      this.selectedImageUrl.set(url);
    }
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

  getStatusLabel(status: string): string {
    return this.t(
      getStatusTranslationKey(status)
    );
  }

  getCategoryLabel(category: string): string {
    return this.t(
      getCategoryTranslationKey(category)
    );
  }

  getConditionLabel(condition: string): string {
    return this.t(
      getConditionTranslationKey(condition)
    );
  }

  t(key: string) {
    return this.translationService.t(key);
  }

  async publishArticle(): Promise<void> {
    await this.updateStatus('online');
  }

  async updateStatus(
    status: 'online' | 'reserved' | 'sold' | 'archived'
  ): Promise<void> {
    const article = this.article();

    if (!article) {
      return;
    }

    this.errorMessage.set('');

    const { error } =
      await this.supabaseService.client
        .from('articles')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);

    if (error) {
      console.error('Supabase update status error:', error);
      this.errorMessage.set(
        this.t('updateStatusFailed')
      );
      return;
    }

    this.article.update(current =>
      current
        ? {
          ...current,
          status
        }
        : current
    );
  }

  async reserveArticle(): Promise<void> {
    await this.updateStatus('reserved');
  }

  async removeReservation(): Promise<void> {
    await this.updateStatus('online');
  }

  async markAsSold(): Promise<void> {
    await this.updateStatus('sold');
  }

  async archiveArticle(): Promise<void> {
    await this.updateStatus('archived');
  }

  async restoreArticle(): Promise<void> {
    await this.updateStatus('online');
  }

  async deleteArticle(): Promise<void> {
    const article = this.article();

    if (!article) {
      return;
    }

    const confirmed = window.confirm(
      this.t('deleteArticleConfirm')
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set('');

    try {
      const storagePaths =
        article.article_images
          .map(image => image.storage_path)
          .filter(Boolean);

      if (storagePaths.length > 0) {
        const { error: storageError } =
          await this.supabaseService.client.storage
            .from('article-images')
            .remove(storagePaths);

        if (storageError) {
          console.error(
            'Supabase storage delete error:',
            storageError
          );

          this.errorMessage.set(
            this.t('deleteArticleFailed')
          );

          return;
        }
      }

      const { error: imagesError } =
        await this.supabaseService.client
          .from('article_images')
          .delete()
          .eq('article_id', article.id);

      if (imagesError) {
        console.error(
          'Supabase article images delete error:',
          imagesError
        );

        this.errorMessage.set(
          this.t('deleteArticleFailed')
        );

        return;
      }

      const { error: articleError } =
        await this.supabaseService.client
          .from('articles')
          .delete()
          .eq('id', article.id);

      if (articleError) {
        console.error(
          'Supabase article delete error:',
          articleError
        );

        this.errorMessage.set(
          this.t('deleteArticleFailed')
        );

        return;
      }

      await this.router.navigate(['/articles']);

    } catch (error) {
      console.error(
        'Fehler beim Löschen des Artikels:',
        error
      );

      this.errorMessage.set(
        this.t('deleteArticleFailed')
      );
    }
  }

  async duplicateArticle(): Promise<void> {
  const article = this.article();

  if (!article) {
    return;
  }

  this.errorMessage.set('');

  const {
    data: { user },
    error: userError
  } = await this.supabaseService.getUser();

  if (userError || !user) {
    console.error('User konnte nicht geladen werden:', userError);

    this.errorMessage.set(
      this.t('userNotFound')
    );

    return;
  }

  const { data, error } =
    await this.supabaseService.client
      .from('articles')
      .insert({
        user_id: user.id,
        title: article.title,
        description: article.description,
        category: article.category,
        brand: article.brand,
        size: article.size,
        condition: article.condition,
        purchase_price_cents: article.purchase_price_cents,
        status: 'draft'
      })
      .select('id')
      .single();

  if (error || !data) {
    console.error(
      'Supabase duplicate article error:',
      error
    );

    this.errorMessage.set(
      this.t('duplicateArticleFailed')
    );

    return;
  }

  await this.router.navigate([
    '/articles',
    data.id,
    'edit'
  ]);
}
}