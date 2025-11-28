import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

interface Payment {
  id: number;
  user: string;
  amount: number;
  method: string;
  status: 'Success' | 'Failed' | 'Refunded';
  date: string;
  refundIssued: boolean;
}

@Component({
  selector: 'app-admin-payments',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-payments.html',
  styleUrls: ['./admin-payments.scss'],
})
export class AdminPayments implements OnInit {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  searchTerm = '';
  pageSize = 10;
  pageSizes: number[] = [5, 10, 20];
  currentPage = 1;
  totalPages = 1;

  API_URL = 'https://primabi.co/api/v1/admin/payments/users';
  loading = false;

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadPayments();
  }

formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}
  loadPayments() {
    const token = localStorage.getItem('token');

    if (!token) {
      Swal.fire('Error', 'No authentication token found in localStorage', 'error');
      return;
    }

    this.loading = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(this.API_URL, { headers }).subscribe({
      next: (res) => {
        this.loading = false;

        if (res?.data) {
          this.payments = res.data.map((p: any, index: number) => ({
            id: index + 1,
            user: p.name || '-',
            amount: p.currentDeposit || 0,
            method: 'Cash',
            status: p.totalRefunds > 0 ? 'Refunded' : 'Success',

            // ✅ Proper Date Handling Here
            date: p.lastPayment?.date
              ? this.formatDate(p.lastPayment.date)
              : '-',

            refundIssued: p.totalRefunds > 0
          }));

          this.totalPages = Math.ceil(this.payments.length / this.pageSize);

          this.setPage(1);

          this.cd.detectChanges();
        } else {
          Swal.fire('Error', 'Unexpected API response', 'error');
        }
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'Failed to load payments', 'error');
      }
    });
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();

    const filtered = this.payments.filter(
      p =>
        p.user.toLowerCase().includes(term) ||
        p.method.toLowerCase().includes(term) ||
        p.status.toLowerCase().includes(term)
    );

    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    this.currentPage = 1;

    this.filteredPayments = filtered.slice(0, this.pageSize);
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  setPage(page: number) {
    this.currentPage = page;

    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;

    const term = this.searchTerm.toLowerCase();

    const filtered = this.payments.filter(
      p =>
        p.user.toLowerCase().includes(term) ||
        p.method.toLowerCase().includes(term) ||
        p.status.toLowerCase().includes(term)
    );

    this.filteredPayments = filtered.slice(start, end);
  }

  prev() {
    if (this.currentPage > 1) this.setPage(this.currentPage - 1);
  }

  next() {
    if (this.currentPage < this.totalPages) this.setPage(this.currentPage + 1);
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
