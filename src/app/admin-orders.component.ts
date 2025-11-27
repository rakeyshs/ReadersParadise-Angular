import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

// ---------------- INTERFACES ----------------
interface ApiSubscription {
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  roles?: string[];
  subscription?: ApiSubscription | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  subscriptionStatus: string;
  startDate: string;
  endDate: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

// ---------------- COMPONENT ----------------
@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="users-root">
    <!-- Header Toolbar -->
    <div class="toolbar">
      <div class="left">
        <div class="search">
          <svg class="icon-search" viewBox="0 0 24 24">
            <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
              fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>

          <input
            class="input-search"
            type="text"
            placeholder="Search by name, email, or role"
            [(ngModel)]="searchTerm"
            (input)="setPage(1)" />

          <button *ngIf="searchTerm" class="clear-btn" (click)="clearSearch()">
            <svg viewBox="0 0 24 24" class="icon-clear">
              <path d="M18 6L6 18M6 6l12 12"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                stroke-linejoin="round" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="right">
        <label>Show
          <select class="select-size" [(ngModel)]="pageSize" (change)="setPage(1)">
            <option *ngFor="let s of pageSizes" [value]="s">{{s}}</option>
          </select> entries
        </label>
        <button class="btn btn-secondary" (click)="loadUsers()" [disabled]="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <table class="users-table" *ngIf="!loading; else loadingTpl">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Roles</th>
          <th>Email Verified</th>
          <th>Phone Verified</th>
          <th>Subscription</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let u of pagedUsers; let i = index">
          <td>{{ (currentPage - 1) * pageSize + i + 1 }}</td>
          <td>{{u.name}}</td>
          <td>{{u.email}}</td>
          <td>{{u.phone || '-'}}</td>
          <td>
            <span class="role-badge" *ngFor="let r of u.roles">{{r}}</span>
          </td>
          <td>
            <span [class.yes]="u.isEmailVerified" [class.no]="!u.isEmailVerified">
              {{u.isEmailVerified ? 'Yes' : 'No'}}
            </span>
          </td>
          <td>
            <span [class.yes]="u.isPhoneVerified" [class.no]="!u.isPhoneVerified">
              {{u.isPhoneVerified ? 'Yes' : 'No'}}
            </span>
          </td>
          <td>
            <span class="status" [attr.data-status]="u.subscriptionStatus">
              {{u.subscriptionStatus || 'N/A'}}
            </span>
            <br>
            <small *ngIf="u.subscriptionStatus !== 'N/A'">{{u.startDate}} → {{u.endDate}}</small>
          </td>
          <td>{{u.createdAt}}</td>
        </tr>

        <tr *ngIf="pagedUsers.length === 0">
          <td colspan="9" class="no-results">No users found</td>
        </tr>
      </tbody>
    </table>

    <ng-template #loadingTpl>
      <div class="loading">Loading users...</div>
    </ng-template>

    <!-- Pagination -->
    <div class="pager" *ngIf="totalPages > 1">
      <button (click)="prev()" [disabled]="currentPage === 1">Prev</button>
      <ng-container *ngFor="let p of pages">
        <button [class.active]="p === currentPage" (click)="setPage(p)">{{p}}</button>
      </ng-container>
      <button (click)="next()" [disabled]="currentPage === totalPages">Next</button>
    </div>
  </div>
  `,
  styles: [`
    :host{display:block;padding:8px}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .search{display:flex;align-items:center;gap:8px;background:#fff;padding:6px 8px;border-radius:12px;
      border:1px solid rgba(11,63,102,0.06);width:340px;box-shadow:0 6px 18px rgba(11,63,102,0.03);}
    .icon-search{width:18px;height:18px;color:rgba(7,22,58,0.48)}
    .input-search{flex:1;border:0;background:transparent;padding:8px 6px;font-size:14px;color:#111}
    .clear-btn{background:transparent;border:0;padding:6px;border-radius:8px;cursor:pointer}
    .select-size{margin-left:8px;padding:6px 10px;border-radius:8px;border:1px solid rgba(11,63,102,0.06);background:white}
    .btn{padding:8px 12px;border-radius:10px;border:0;font-weight:700;cursor:pointer}
    .btn-secondary{background:linear-gradient(90deg,#2563eb,#06b6d4);color:#fff}
    .users-table{width:100%;border-collapse:collapse;background:#fff}
    .users-table th,.users-table td{padding:10px;border:1px solid #eef3f8;text-align:left}
    .users-table thead th{background:#f8fafc;font-weight:600}
    .no-results{text-align:center;padding:18px;color:#6b7280}
    .pager{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:18px}
    .pager button{min-width:40px;padding:8px 12px;border-radius:10px;border:1px solid rgba(11,63,102,0.06);background:white;cursor:pointer;font-weight:700}
    .pager button.active{background:linear-gradient(90deg,#2563eb,#06b6d4);color:#fff}
    .role-badge{background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:8px;margin-right:4px;font-size:12px}
    .status[data-status="Active"]{color:#059669}
    .status[data-status="Inactive"]{color:#b91c1c}
    .yes{color:#059669;font-weight:600}
    .no{color:#b91c1c;font-weight:600}
    .loading{text-align:center;padding:24px;font-weight:600;color:#0369a1;}
  `]
})
export class AdminOrdersComponent implements OnInit {
  private readonly API_URL = 'https://primabi.co/api/v1/admin/AdminUsers?page=1&pageSize=5&sortBy=createdAt&sortOrder=desc';

  users: User[] = [];
  searchTerm = '';
  pageSizes = [5, 10, 20];
  pageSize = 5;
  currentPage = 1;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  /** Load users from API */
  loadUsers(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No authentication token found', 'error');
      return;
    }

    this.loading = true;

    this.http.get<{ data: { users: ApiUser[] } }>(this.API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data?.users) {
          this.users = res.data.users.map(u => this.mapApiToUser(u));
          this.setPage(1);
        } else {
          Swal.fire('Error', 'Unexpected API response format', 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error loading users:', err);
        Swal.fire(
          'Error',
          err?.status === 401 ? 'Session expired or unauthorized access' : 'Failed to fetch users',
          'error'
        );
      }
    });
  }

  /** Map API response to UI model */
  private mapApiToUser(u: ApiUser): User {
    const sub = u.subscription;
    return {
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      email: u.email,
      phone: u.phoneNumber || '',
      roles: u.roles || [],
      subscriptionStatus: sub?.status ?? 'N/A',
      startDate: sub?.startDate ? new Date(sub.startDate).toLocaleDateString() : '',
      endDate: sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : '',
      isEmailVerified: u.isEmailVerified ?? false,
      isPhoneVerified: u.isPhoneVerified ?? false,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
    };
  }

  /** Filtering logic */
  get filteredUsers(): User[] {
    const q = this.searchTerm.toLowerCase();
    return this.users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles.join(',').toLowerCase().includes(q)
    );
  }

  /** Pagination logic */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  setPage(n: number): void {
    this.currentPage = Math.min(Math.max(n, 1), this.totalPages);
  }

  prev(): void { this.setPage(this.currentPage - 1); }
  next(): void { this.setPage(this.currentPage + 1); }
  clearSearch(): void { this.searchTerm = ''; this.setPage(1); }
}
