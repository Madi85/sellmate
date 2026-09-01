import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

type SelectedImage = {
  file: File;
  previewUrl: string;
};

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

  selectedImages: SelectedImage[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      return;
    }

    const files = Array.from(input.files);

    const remainingSlots = 10 - this.selectedImages.length;
    const selectedFiles = files.slice(0, remainingSlots);

    for (const file of selectedFiles) {

      if (!file.type.startsWith('image/')) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);

      this.selectedImages.push({
        file,
        previewUrl
      });
    }

    // Erlaubt später erneut dieselbe Datei auszuwählen
    input.value = '';
  }

  removeImage(index: number) {
    const image = this.selectedImages[index];

    URL.revokeObjectURL(image.previewUrl);

    this.selectedImages.splice(index, 1);
  }

  async saveArticle() {
    this.errorMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'Bitte gib einen Titel ein.';
      return;
    }

    this.loading = true;

    try {

      // Benutzer holen
      const { data: userData, error: userError } =
        await this.supabaseService.getUser();

      if (userError || !userData.user) {
        this.errorMessage = 'Benutzer konnte nicht ermittelt werden.';
        return;
      }

      const userId = userData.user.id;

      const purchasePriceCents =
        this.purchasePrice !== null
          ? Math.round(this.purchasePrice * 100)
          : null;

      // ---------------------------------------
      // 1. Artikel erstellen
      // ---------------------------------------

      const { data: article, error: articleError } =
        await this.supabaseService.client
          .from('articles')
          .insert({
            user_id: userId,
            title: this.title.trim(),
            description: this.description.trim() || null,
            category: this.category || null,
            brand: this.brand.trim() || null,
            size: this.size.trim() || null,
            condition: this.condition || null,
            purchase_price_cents: purchasePriceCents,
            status: 'draft'
          })
          .select('id')
          .single();

      if (articleError || !article) {
        this.errorMessage =
          articleError?.message ?? 'Artikel konnte nicht gespeichert werden.';
        return;
      }

      // ---------------------------------------
      // 2. Bilder hochladen
      // ---------------------------------------

      for (let index = 0; index < this.selectedImages.length; index++) {

        const selectedImage = this.selectedImages[index];

        const extension =
          selectedImage.file.name.split('.').pop()?.toLowerCase() || 'jpg';

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        const storagePath =
          `${userId}/${article.id}/${fileName}`;

        const { error: uploadError } =
          await this.supabaseService.client.storage
            .from('article-images')
            .upload(
              storagePath,
              selectedImage.file,
              {
                cacheControl: '3600',
                upsert: false
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        // ---------------------------------------
        // 3. Bild in article_images speichern
        // ---------------------------------------

        const { error: imageDbError } =
          await this.supabaseService.client
            .from('article_images')
            .insert({
              article_id: article.id,
              storage_path: storagePath,
              sort_order: index,
              is_cover: index === 0
            });

        if (imageDbError) {
          throw imageDbError;
        }
      }

      await this.router.navigate(['/articles']);

    } catch (error) {
      console.error('Fehler beim Speichern:', error);

      this.errorMessage =
        'Der Artikel oder die Bilder konnten nicht vollständig gespeichert werden.';

    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.router.navigate(['/articles']);
  }
}