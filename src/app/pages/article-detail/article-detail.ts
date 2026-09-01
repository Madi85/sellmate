import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

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
    private supabaseService: SupabaseService
  ) {}

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

  formatPrice(cents: number | null) {

    if (cents === null) {
      return '–';
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  }

  
}