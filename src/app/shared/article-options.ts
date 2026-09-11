export const ARTICLE_CATEGORIES = [
    'clothing',
    'shoes',
    'accessories',
    'toys',
    'home',
    'other'
] as const;

export const ARTICLE_CONDITIONS = [
    'new',
    'like_new',
    'very_good',
    'good',
    'satisfactory'
] as const;

export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];
export type ArticleCondition = typeof ARTICLE_CONDITIONS[number];

export function getCategoryTranslationKey(category: string): string {
    switch (category) {
        case 'clothing':
            return 'categoryClothing';
        case 'shoes':
            return 'categoryShoes';
        case 'accessories':
            return 'categoryAccessories';
        case 'toys':
            return 'categoryToys';
        case 'home':
            return 'categoryHome';
        case 'other':
            return 'categoryOther';
        default:
            return category;
    }
}

export function getConditionTranslationKey(condition: string): string {
    switch (condition) {
        case 'new':
            return 'conditionNew';
        case 'like_new':
            return 'conditionLikeNew';
        case 'very_good':
            return 'conditionVeryGood';
        case 'good':
            return 'conditionGood';
        case 'satisfactory':
            return 'conditionSatisfactory';
        default:
            return condition;
    }
}

export const ARTICLE_STATUSES = [
    'draft',
    'published',
    'sold'
] as const;

export type ArticleStatus =
    typeof ARTICLE_STATUSES[number];

export function getStatusTranslationKey(status: string): string {
    switch (status) {
        case 'draft':
            return 'statusDraft';
        case 'published':
            return 'statusPublished';
        case 'sold':
            return 'statusSold';
        default:
            return status;
    }
}