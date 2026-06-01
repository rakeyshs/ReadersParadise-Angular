import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthGuard } from './auth.guard';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { AdminOrders } from './components/admin-orders/admin-orders';
import { AdminBook } from './components/admin-book/admin-book';
import { BookAdd } from './components/book-add/book-add';
import { AdminInventory } from './components/admin-inventory/admin-inventory';
import { PricingPlans } from './components/pricing-plans/pricing-plans';
import { AdminReturns } from './components/admin-returns/admin-returns';
import { AdminPayments } from './components/admin-payments/admin-payments';
import { AdminDashboardOverview } from './components/admin-dashboard-overview/admin-dashboard-overview';
import { BookHistory } from './components/book-history/book-history';
import { AdminCategories } from './components/admin-categories/admin-categories';
import { PrivacyPolicyComponent } from './components/PrivacyPolicy/privacy-policy-component/privacy-policy-component';

export const routes: Routes = [
  // ✅ Default redirect to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'privacy-policy', component: PrivacyPolicyComponent },


  // ✅ Login Page
  { path: 'login', component: LoginComponent },

  // ✅ Admin Layout Protected Route
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [AuthGuard],
    children: [
       { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
       // default inside layout

       { path: 'dashboard', component: AdminDashboardOverview },
      { path: 'orders', component: AdminOrders },
      { path: 'books', component: AdminBook }, // ✅ new route
	  {path:'books-add',component:BookAdd},
    {path:'inventory',component:AdminInventory},
    {path:'pricing',component:PricingPlans},
    {path:'returns',component:AdminReturns},
    {path:'payments',component:AdminPayments},
     {path:'history',component:BookHistory},
     {path:'category',component:AdminCategories}


    ]
  },

  // ✅ Wildcard fallback
  { path: '**', redirectTo: 'login' }
];
