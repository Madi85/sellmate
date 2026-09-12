import { Component, OnInit, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';

type ArticleStatistics = {
  total: number;
  draft: number;
  online: number;
  reserved: number;
  sold: number;
  archived: number;

  totalPurchaseValue: number;
  soldPurchaseValue: number;

  salesRevenue: number;
  profit: number;
};

@Component({
  selector: 'app-statistics',
  imports: [],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss'
})
export class Statistics implements OnInit {

  loading = signal(true);
  errorMessage = signal('');

  statistics = signal<ArticleStatistics>({
    total: 0,
    draft: 0,
    online: 0,
    reserved: 0,
    sold: 0,
    archived: 0,

    totalPurchaseValue: 0,
    soldPurchaseValue: 0,

    salesRevenue: 0,
    profit: 0
  });

  constructor(
    private supabaseService: SupabaseService,
    private translationService: TranslationService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadStatistics();
  }

  async loadStatistics(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    const { data, error } =
      await this.supabaseService.client
        .from('articles')
        .select(
          'status, purchase_price_cents, sale_price_cents'
        );

    if (error) {
      console.error(
        'Supabase statistics load error:',
        error
      );

      this.errorMessage.set(
        this.t('statisticsLoadFailed')
      );

      this.loading.set(false);
      return;
    }

    const articles = data ?? [];

    const soldArticles =
      articles.filter(
        article => article.status === 'sold'
      );

    const totalPurchaseValue =
      articles.reduce(
        (sum, article) =>
          sum + (article.purchase_price_cents ?? 0),
        0
      );

    const soldPurchaseValue =
      soldArticles.reduce(
        (sum, article) =>
          sum + (article.purchase_price_cents ?? 0),
        0
      );

    const salesRevenue =
      soldArticles.reduce(
        (sum, article) =>
          sum + (article.sale_price_cents ?? 0),
        0
      );

    const profit =
      salesRevenue - soldPurchaseValue;

    this.statistics.set({
      total: articles.length,

      draft: articles.filter(
        article => article.status === 'draft'
      ).length,

      online: articles.filter(
        article => article.status === 'online'
      ).length,

      reserved: articles.filter(
        article => article.status === 'reserved'
      ).length,

      sold: soldArticles.length,

      archived: articles.filter(
        article => article.status === 'archived'
      ).length,

      totalPurchaseValue,
      soldPurchaseValue,
      salesRevenue,
      profit
    });

    this.loading.set(false);
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  formatPrice(cents: number): string {
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

  statusChartData() {
    const stats = this.statistics();

    const max = Math.max(
      stats.draft,
      stats.online,
      stats.reserved,
      stats.sold,
      stats.archived,
      1
    );

    const maxBarHeight = 160;

    return [
      {
        label: this.t('statusDraft'),
        value: stats.draft,
        height:
          stats.draft === 0
            ? 4
            : (stats.draft / max) * maxBarHeight
      },
      {
        label: this.t('statusOnline'),
        value: stats.online,
        height:
          stats.online === 0
            ? 4
            : (stats.online / max) * maxBarHeight
      },
      {
        label: this.t('statusReserved'),
        value: stats.reserved,
        height:
          stats.reserved === 0
            ? 4
            : (stats.reserved / max) * maxBarHeight
      },
      {
        label: this.t('statusSold'),
        value: stats.sold,
        height:
          stats.sold === 0
            ? 4
            : (stats.sold / max) * maxBarHeight
      },
      {
        label: this.t('statusArchived'),
        value: stats.archived,
        height:
          stats.archived === 0
            ? 4
            : (stats.archived / max) * maxBarHeight
      }
    ];
  }
}