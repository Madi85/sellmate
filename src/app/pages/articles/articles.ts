import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';

import {
  ARTICLE_CATEGORIES,
  ARTICLE_CONDITIONS,
  ARTICLE_STATUSES,
  getCategoryTranslationKey,
  getConditionTranslationKey,
  getStatusTranslationKey
} from '../../shared/article-options';


type ArticleImage = {
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
};

type Article = {
  id: string;
  title: string;
  category: string | null;
  brand: string | null;
  size: string | null;
  condition: string | null;
  status: string;

  purchase_price_cents: number | null;
  sale_price_cents: number | null;

  sales_platform: string | null;
  selling_fees_cents: number | null;

  sold_at: string | null;
  created_at: string;

  article_images: ArticleImage[];
  coverUrl?: string | null;
};

type SortOption =
  | 'newest'
  | 'oldest'
  | 'purchasePriceAsc'
  | 'purchasePriceDesc'
  | 'salePriceAsc'
  | 'salePriceDesc'
  | 'profitDesc';


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

  searchTerm = signal('');
  selectedCategory = signal('');
  selectedCondition = signal('');
  selectedStatus = signal('');

  selectedSort = signal<SortOption>('newest');

  categories = ARTICLE_CATEGORIES;
  conditions = ARTICLE_CONDITIONS;
  statuses = ARTICLE_STATUSES;


  constructor(
    private supabaseService: SupabaseService,
    private translationService: TranslationService
  ) { }


  ngOnInit(): void {
    this.loadArticles();
  }


  async loadArticles(): Promise<void> {

    this.loading.set(true);
    this.errorMessage.set('');

    try {

      const { data, error } =
        await this.supabaseService.client
          .from('articles')
          .select(`
            id,
            title,
            category,
            brand,
            size,
            condition,
            status,
            purchase_price_cents,
            sale_price_cents,
            sales_platform,
            selling_fees_cents,
            sold_at,
            created_at,
            article_images (
              storage_path,
              is_cover,
              sort_order
            )
          `)
          .order(
            'created_at',
            { ascending: false }
          );


      if (error) {

        console.error(
          'Supabase articles load error:',
          error
        );

        this.errorMessage.set(
          this.t('articlesLoadFailed')
        );

        return;
      }


      const articles: Article[] =
        data ?? [];


      for (const article of articles) {

        const sortedImages =
          [...(article.article_images ?? [])]
            .sort(
              (a, b) =>
                a.sort_order - b.sort_order
            );


        const coverImage =
          sortedImages.find(
            image => image.is_cover
          )
          ??
          sortedImages[0];


        if (!coverImage) {

          article.coverUrl = null;
          continue;
        }


        const {
          data: signedUrlData,
          error: signedUrlError
        } =
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


        article.coverUrl =
          signedUrlData.signedUrl;
      }


      this.articles.set(articles);

    } catch (error) {

      console.error(
        'Fehler beim Laden der Artikel:',
        error
      );

      this.errorMessage.set(
        this.t('articlesLoadFailed')
      );

    } finally {

      this.loading.set(false);
    }
  }


  t(key: string): string {
    return this.translationService.t(key);
  }


  filteredArticles(): Article[] {

    const search =
      this.searchTerm()
        .trim()
        .toLowerCase();

    const category =
      this.selectedCategory();

    const condition =
      this.selectedCondition();

    const status =
      this.selectedStatus();

    const sort =
      this.selectedSort();


    const filtered =
      this.articles().filter(article => {

        const matchesSearch =
          !search ||
          article.title
            .toLowerCase()
            .includes(search) ||
          (article.brand ?? '')
            .toLowerCase()
            .includes(search);


        const matchesCategory =
          !category ||
          article.category === category;


        const matchesCondition =
          !condition ||
          article.condition === condition;


        const matchesStatus =
          !status ||
          article.status === status;


        return (
          matchesSearch &&
          matchesCategory &&
          matchesCondition &&
          matchesStatus
        );
      });


    return [...filtered].sort(
      (a, b) => {

        switch (sort) {

          case 'oldest':
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );


          case 'purchasePriceAsc':
            return (
              this.getSortablePrice(
                a.purchase_price_cents
              ) -
              this.getSortablePrice(
                b.purchase_price_cents
              )
            );


          case 'purchasePriceDesc':
            return (
              this.getSortablePrice(
                b.purchase_price_cents
              ) -
              this.getSortablePrice(
                a.purchase_price_cents
              )
            );


          case 'salePriceAsc':
            return (
              this.getSortablePrice(
                a.sale_price_cents
              ) -
              this.getSortablePrice(
                b.sale_price_cents
              )
            );


          case 'salePriceDesc':
            return (
              this.getSortablePrice(
                b.sale_price_cents
              ) -
              this.getSortablePrice(
                a.sale_price_cents
              )
            );


          case 'profitDesc':
            return (
              this.getSortableProfit(b) -
              this.getSortableProfit(a)
            );


          case 'newest':
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      }
    );
  }


  private getSortablePrice(
    value: number | null
  ): number {

    return value ?? -1;
  }


  private getSortableProfit(
    article: Article
  ): number {

    return this.getProfit(article) ?? -1;
  }


  formatPrice(
    cents: number | null
  ): string {

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


    return new Intl.NumberFormat(
      locale,
      {
        style: 'currency',
        currency: 'EUR'
      }
    ).format(cents / 100);
  }


  formatDate(
    date: string | null
  ): string {

    if (!date) {
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


    return new Intl.DateTimeFormat(
      locale,
      {
        dateStyle: 'medium'
      }
    ).format(
      new Date(date)
    );
  }


  getProfit(
    article: Article
  ): number | null {

    if (
      article.status !== 'sold' ||
      article.purchase_price_cents === null ||
      article.sale_price_cents === null
    ) {
      return null;
    }


    const sellingFees =
      article.selling_fees_cents ?? 0;


    return (
      article.sale_price_cents -
      article.purchase_price_cents -
      sellingFees
    );
  }


  getConditionLabel(
    condition: string | null
  ): string {

    if (!condition) {
      return '–';
    }


    return this.t(
      getConditionTranslationKey(
        condition
      )
    );
  }


  getCategoryLabel(
    category: string | null
  ): string {

    if (!category) {
      return '–';
    }


    return this.t(
      getCategoryTranslationKey(
        category
      )
    );
  }


  getStatusLabel(
    status: string
  ): string {

    return this.t(
      getStatusTranslationKey(
        status
      )
    );
  }


  resetFilters(): void {

    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.selectedCondition.set('');
    this.selectedStatus.set('');
  }


  hasActiveFilters(): boolean {

    return (
      this.searchTerm()
        .trim() !== '' ||
      this.selectedCategory() !== '' ||
      this.selectedCondition() !== '' ||
      this.selectedStatus() !== ''
    );
  }
}