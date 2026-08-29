import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data, error } = await supabaseService.getSession();

  if (!error && data.session) {
    return true;
  }

  return router.createUrlTree(['/login']);
};