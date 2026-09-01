import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

type ExistingImage = {
  id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  url?: string;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
};

@Component({
  selector: 'app-article-edit',
  imports: [FormsModule, RouterLink],
  templateUrl: './article-edit.html',
  styleUrl: './article-edit.scss'
})
export class ArticleEdit implements OnInit {

  articleId = '';

  title = '';
  description = '';
  category = '';
  brand = '';
  size = '';
  condition = '';
  purchasePrice: number | null = null;

  existingImages = signal<ExistingImage[]>([]);
  newImages = signal<SelectedImage[]>([]);

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      await this.router.navigate(['/articles']);
      return;
    }

    this.articleId = id;
    await this.loadArticle();
  }

  async loadArticle() {
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
          article_images (
            id,
            storage_path,
            sort_order,
            is_cover
          )
        `)
        .eq('id', this.articleId)
        .single();

      if (error || !data) {
        this.errorMessage.set(
          error?.message ?? 'Artikel konnte nicht geladen werden.'
        );
        return;
      }

      this.title = data.title;
      this.description = data.description ?? '';
      this.category = data.category ?? '';
      this.brand = data.brand ?? '';
      this.size = data.size ?? '';
      this.condition = data.condition ?? '';

      this.purchasePrice =
        data.purchase_price_cents !== null
          ? data.purchase_price_cents / 100
          : null;

      const images: ExistingImage[] = (data.article_images ?? [])
        .map(image => ({
          id: image.id,
          storage_path: image.storage_path,
          sort_order: image.sort_order,
          is_cover: image.is_cover,
          url: undefined
        }))
        .sort((a, b) => a.sort_order - b.sort_order);

      for (const image of images) {
        const { data: signedData } =
          await this.supabaseService.client.storage
            .from('article-images')
            .createSignedUrl(image.storage_path, 60 * 60);

        image.url = signedData?.signedUrl;
      }

      this.existingImages.set(images);

    } catch (error) {
      console.error(error);
      this.errorMessage.set('Artikel konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      return;
    }

    const currentCount =
      this.existingImages().length + this.newImages().length;

    const remainingSlots = Math.max(0, 10 - currentCount);

    const files = Array.from(input.files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    const newEntries = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    this.newImages.update(current => [
      ...current,
      ...newEntries
    ]);

    input.value = '';
  }

  removeNewImage(index: number) {
    const image = this.newImages()[index];

    URL.revokeObjectURL(image.previewUrl);

    this.newImages.update(images =>
      images.filter((_, i) => i !== index)
    );
  }

  async deleteExistingImage(image: ExistingImage) {
    const { error: storageError } =
      await this.supabaseService.client.storage
        .from('article-images')
        .remove([image.storage_path]);

    if (storageError) {
      this.errorMessage.set(storageError.message);
      return;
    }

    const { error: dbError } =
      await this.supabaseService.client
        .from('article_images')
        .delete()
        .eq('id', image.id);

    if (dbError) {
      this.errorMessage.set(dbError.message);
      return;
    }

    this.existingImages.update(images =>
      images.filter(item => item.id !== image.id)
    );

    await this.ensureCoverImage();
  }

  async setCoverImage(image: ExistingImage) {
    await this.supabaseService.client
      .from('article_images')
      .update({ is_cover: false })
      .eq('article_id', this.articleId);

    const { error } =
      await this.supabaseService.client
        .from('article_images')
        .update({ is_cover: true })
        .eq('id', image.id);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.existingImages.update(images =>
      images.map(item => ({
        ...item,
        is_cover: item.id === image.id
      }))
    );
  }

  async ensureCoverImage() {
    const images = this.existingImages();

    if (images.length === 0) {
      return;
    }

    if (images.some(image => image.is_cover)) {
      return;
    }

    await this.setCoverImage(images[0]);
  }

  async saveArticle() {
    if (!this.title.trim()) {
      this.errorMessage.set('Bitte gib einen Titel ein.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const purchasePriceCents =
        this.purchasePrice !== null
          ? Math.round(this.purchasePrice * 100)
          : null;

      const { error: updateError } =
        await this.supabaseService.client
          .from('articles')
          .update({
            title: this.title.trim(),
            description: this.description.trim() || null,
            category: this.category || null,
            brand: this.brand.trim() || null,
            size: this.size.trim() || null,
            condition: this.condition || null,
            purchase_price_cents: purchasePriceCents,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.articleId);

      if (updateError) {
        this.errorMessage.set(updateError.message);
        return;
      }

      const { data: userData, error: userError } =
        await this.supabaseService.getUser();

      if (userError || !userData.user) {
        this.errorMessage.set(
          'Benutzer konnte nicht ermittelt werden.'
        );
        return;
      }

      const userId = userData.user.id;

      let nextSortOrder = this.existingImages().length;

      const hasCover =
        this.existingImages().some(image => image.is_cover);

      for (let index = 0; index < this.newImages().length; index++) {
        const selectedImage = this.newImages()[index];

        const extension =
          selectedImage.file.name
            .split('.')
            .pop()
            ?.toLowerCase() || 'jpg';

        const storagePath =
          `${userId}/${this.articleId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await this.supabaseService.client.storage
            .from('article-images')
            .upload(storagePath, selectedImage.file, {
              cacheControl: '3600',
              upsert: false
            });

        if (uploadError) {
          throw uploadError;
        }

        const { error: imageError } =
          await this.supabaseService.client
            .from('article_images')
            .insert({
              article_id: this.articleId,
              storage_path: storagePath,
              sort_order: nextSortOrder,
              is_cover: !hasCover && index === 0
            });

        if (imageError) {
          throw imageError;
        }

        nextSortOrder++;
      }

      await this.router.navigate([
        '/articles',
        this.articleId
      ]);

    } catch (error) {
      console.error(error);
      this.errorMessage.set(
        'Änderungen konnten nicht vollständig gespeichert werden.'
      );
    } finally {
      this.saving.set(false);
    }
  }
}