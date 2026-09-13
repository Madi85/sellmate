import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SupabaseService } from '../../services/supabase';
import { TranslationService } from '../../services/translation';
import {
  getStatusTranslationKey
} from '../../shared/article-options';

type DashboardArticle = {
  id: string;
  title: string;
  status: string;
  purchase_price_cents: number | null;
  sale_price_cents: number | null;
  selling_fees_cents: number | null;
  created_at: string;
  sold_at: string | null;
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {

  loading = signal(true);
  errorMessage = signal('');

  totalArticles = signal(0);
  onlineArticles = signal(0);
  soldArticles = signal(0);

  salesRevenue = signal(0);
  profit = signal(0);

  recentArticles = signal<DashboardArticle[]>([]);
  recentlySoldArticles = signal<DashboardArticle[]>([]);

  constructor(
    private supabaseService: SupabaseService,
    private translationService: TranslationService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    const { data, error } =
      await this.supabaseService.client
        .from('articles')
        .select(`
          id,
          title,
          status,
          purchase_price_cents,
          sale_price_cents,
          selling_fees_cents,
          created_at,
          sold_at
        `)
        .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Supabase dashboard load error:',
        error
      );

      this.errorMessage.set(
        this.t('dashboardLoadFailed')
      );

      this.loading.set(false);
      return;
    }

    const articles: DashboardArticle[] =
      data ?? [];

    const soldArticles =
      articles.filter(
        article => article.status === 'sold'
      );

    this.totalArticles.set(
      articles.length
    );

    this.onlineArticles.set(
      articles.filter(
        article => article.status === 'online'
      ).length
    );

    this.soldArticles.set(
      soldArticles.length
    );

    const revenue =
      soldArticles.reduce(
        (sum, article) =>
          sum + (article.sale_price_cents ?? 0),
        0
      );

    const purchaseCost =
      soldArticles.reduce(
        (sum, article) =>
          sum + (article.purchase_price_cents ?? 0),
        0
      );

    const fees =
      soldArticles.reduce(
        (sum, article) =>
          sum + (article.selling_fees_cents ?? 0),
        0
      );

    this.salesRevenue.set(
      revenue
    );

    this.profit.set(
      revenue - purchaseCost - fees
    );

    this.recentArticles.set(
      articles.slice(0, 4)
    );

    this.recentlySoldArticles.set(
      [...soldArticles]
        .sort((a, b) => {
          const dateA =
            a.sold_at
              ? new Date(a.sold_at).getTime()
              : 0;

          const dateB =
            b.sold_at
              ? new Date(b.sold_at).getTime()
              : 0;

          return dateB - dateA;
        })
        .slice(0, 4)
    );

    this.loading.set(false);
  }

  t(key: string): string {
    return this.translationService.t(key);
  }
  getStatusLabel(status: string): string {
    return this.t(
      getStatusTranslationKey(status)
    );
  }
  formatPrice(
    cents: number
  ): string {

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

  async logout(): Promise<void> {
    await this.supabaseService.signOut();
    await this.router.navigate(['/login']);
  }
}