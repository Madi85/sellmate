import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-article-create',
  imports: [FormsModule],
  templateUrl: './article-create.html',
  styleUrl: './article-create.scss'
})
export class ArticleCreate {

  title = '';
  description = '';
  category = '';
  brand = '';
  size = '';
  condition = '';
  purchasePrice: number | null = null;

  loading = false;
  errorMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) { }

  async saveArticle() {
    this.errorMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'Bitte gib einen Titel ein.';
      return;
    }

    this.loading = true;

    try {
      const { data: userData, error: userError } =
        await this.supabaseService.getUser();

      if (userError || !userData.user) {
        this.errorMessage = 'Benutzer konnte nicht ermittelt werden.';
        return;
      }

      const purchasePriceCents =
        this.purchasePrice !== null
          ? Math.round(this.purchasePrice * 100)
          : null;

      const { error } = await this.supabaseService.client
        .from('articles')
        .insert({
          user_id: userData.user.id,
          title: this.title.trim(),
          description: this.description.trim() || null,
          category: this.category || null,
          brand: this.brand.trim() || null,
          size: this.size.trim() || null,
          condition: this.condition || null,
          purchase_price_cents: purchasePriceCents,
          status: 'draft'
        });

      if (error) {
        this.errorMessage = error.message;
        return;
      }

      await this.router.navigate(['/articles']);

    } catch (error) {
      console.error(error);
      this.errorMessage = 'Artikel konnte nicht gespeichert werden.';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.router.navigate(['/articles']);
  }
}