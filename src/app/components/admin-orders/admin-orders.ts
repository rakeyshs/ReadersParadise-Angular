import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// ---------------- INTERFACES ----------------

interface ApiSubscription {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalDurationDays?: number;
  remainingDays?: number;
  isExpired?: boolean;
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
  subscriptionType?: string;
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
  subscriptionType: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  totalDurationDays: number;
  remainingDays: number;
  isExpired: boolean;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, CommonModule, FormsModule, HttpClientModule, MatTooltipModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss'],
})
export class AdminOrders implements OnInit {
  private readonly API_URL = 'https://primabi.co/api/v1/admin/AdminUsers?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc';

  users: User[] = [];
  searchTerm = '';
  pageSizes = [5, 10, 20];
  pageSize = 10;
  currentPage = 1;
  loading = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ── Load users ────────────────────────────────────────────────────────────

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
          this.cdr.markForCheck();
        } else {
          Swal.fire('Error', 'Unexpected API response format', 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire(
          'Error',
          err?.status === 401 ? 'Session expired or unauthorized access' : 'Failed to fetch users',
          'error'
        );
      }
    });
  }

  // ── Map API → UI model ────────────────────────────────────────────────────

  private mapApiToUser(u: ApiUser): User {
    const sub = u.subscription;
    return {
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      email: u.email,
      phone: u.phoneNumber || '',
      roles: u.roles || [],
      subscriptionStatus: sub?.status ?? 'N/A',
      startDate:  sub?.startDate  ? new Date(sub.startDate).toLocaleDateString()  : '',
      endDate:    sub?.endDate    ? new Date(sub.endDate).toLocaleDateString()    : '',
      subscriptionType: sub?.type ?? 'N/A',
      isEmailVerified: u.isEmailVerified ?? false,
      isPhoneVerified: u.isPhoneVerified ?? false,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
      totalDurationDays: sub?.totalDurationDays ?? 0,
      remainingDays: sub?.remainingDays ?? 0,
      isExpired: sub?.isExpired ?? false,
    };
  }

  // ── Filtering & pagination ────────────────────────────────────────────────

  get filteredUsers(): User[] {
    const q = this.searchTerm.toLowerCase();
    return this.users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles.join(',').toLowerCase().includes(q)
    );
  }

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

  prev(): void  { this.setPage(this.currentPage - 1); }
  next(): void  { this.setPage(this.currentPage + 1); }
  clearSearch(): void { this.searchTerm = ''; this.setPage(1); }

  // ── Action buttons ────────────────────────────────────────────────────────

  private getHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem('token')}` };
  }

  verifyEmail(userId: string) {
    this.http.post(
      `https://primabi.co/api/v1/admin/AdminUsers/${userId}/verify-email`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next:  () => { Swal.fire('✅ Success', 'Email verified successfully', 'success'); this.loadUsers(); },
      error: () =>   Swal.fire('❌ Error', 'Failed to verify email', 'error')
    });
  }

  verifyPhone(userId: string) {
    this.http.post(
      `https://primabi.co/api/v1/admin/AdminUsers/${userId}/verify-phone`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next:  () => { Swal.fire('✅ Success', 'Phone verified successfully', 'success'); this.loadUsers(); },
      error: () =>   Swal.fire('❌ Error', 'Failed to verify phone', 'error')
    });
  }

  verifyAll(userId: string) {
    this.http.post(
      `https://primabi.co/api/v1/admin/AdminUsers/${userId}/verify-all`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next:  () => { Swal.fire('✅ Success', 'Email & Phone verified successfully', 'success'); this.loadUsers(); },
      error: () =>   Swal.fire('❌ Error', 'Failed to verify both', 'error')
    });
  }

  deleteUser(userId: string) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This user will be permanently deleted!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53935',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.http.post(
        `https://primabi.co/api/v1/admin/AdminUsers/${userId}/delete`,
        { confirm: true, force: true },
        { headers: this.getHeaders() }
      ).subscribe({
        next:  () => { Swal.fire('✅ Deleted!', 'User has been deleted.', 'success'); this.loadUsers(); },
        error: () =>   Swal.fire('❌ Error', 'Failed to delete user', 'error')
      });
    });
  }
}