import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

import { Dashboard } from './pages/dashboard/dashboard';
import { Articles } from './pages/articles/articles';
import { ArticleCreate } from './pages/article-create/article-create';
import { Statistics } from './pages/statistics/statistics';

import { AppLayout } from './layout/app-layout/app-layout';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
  path: '',
  component: AppLayout,
  canActivate: [authGuard],
  children: [
    {
      path: '',
      redirectTo: 'dashboard',
      pathMatch: 'full'
    },
    {
      path: 'dashboard',
      component: Dashboard
    },
    {
      path: 'articles/new',
      component: ArticleCreate
    },
    {
      path: 'articles',
      component: Articles
    },
    {
      path: 'statistics',
      component: Statistics
    }
  ]
},
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];