import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

import { filter, map } from 'rxjs/operators';
import { RouterLink, RouterOutlet, Router, NavigationEnd, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterOutlet,RouterLink,RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayout implements OnInit {
  userName: string = '';
  pageTitle: string = 'Admin Dashboard';
  constructor(private auth: AuthService,private router: Router) {}

ngOnInit() {
  // --- Load user ---
  let user: any = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        user = JSON.parse(userData);
      } catch {}
    }
  }

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  this.userName = (firstName + ' ' + lastName).trim() || 'Admin User';

  // --- Load last pageTitle from sessionStorage if exists ---
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const savedTitle = sessionStorage.getItem('pageTitle');
    if (savedTitle) {
      this.pageTitle = savedTitle;
    }
  }

  // Listen to route changes to update pageTitle
  this.router.events
    .pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    )
    .subscribe(url => {
      let title = 'Admin Dashboard'; // default

    switch (url) {
        case '/admin/dashboard':
          title = 'Admin Dashboard';
          break;
        case '/admin/orders':
          title = 'Users';
          break;
        case '/admin/books':
          title = 'Book Orders';
          break;
        case '/admin/books-add':
          title = 'Add Book';
          break;

        case '/admin/history':
          title = 'Books History';
          break;  
        case '/admin/inventory':
          title = 'Inventory Management';
          break;
        case '/admin/pricing':
          title = 'Pricing & Plans';
          break;
        case '/admin/returns':
          title = 'Returns Management';
          break;
        case '/admin/payments':
          title = 'Payment & Financial Management';
          break;
        default:
          title = 'Admin Dashboard';
      }

      this.pageTitle = title;

      // Save last pageTitle in sessionStorage
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pageTitle', title);
      }
    });
}


  logout() {
    this.auth.logout();
    localStorage.clear();
    location.href = '/login';
  }
}
