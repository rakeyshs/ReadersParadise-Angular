import { Component, AfterViewInit, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Chart from 'chart.js/auto';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard-overview.html',
  styleUrls: ['./admin-dashboard-overview.scss'],
})
export class AdminDashboardOverview implements OnInit, AfterViewInit {
  private isBrowser: boolean;

  stats: any[] = [];
  revenueData: any[] = [];

  years: number[] = [2025, 2026, 2027]; // Available years
  selectedYear: number = 2025;          // Default year

  constructor(
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private getToken(): string | null {
  if (this.isBrowser) {
    return localStorage.getItem('token');
  }
  return null;
}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart rendering handled after API fetch
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  onYearChange() {
    this.loadDashboardData(); // Reload API data when year changes
  }

  // Fetch dashboard data with year parameter
loadDashboardData() {
  const url = `https://primabi.co/api/v1/admin/dashboard/overview?year=${this.selectedYear}`;
  const token = this.getToken();  // Safe token access
  if (!token) {
    console.error('❌ Token not found in localStorage or not in browser');
    return;
  }

  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  this.http.get<any>(url, { headers }).subscribe({
    next: (res) => {
      const s = res.data.summary;

      // ---------- Cards Data ----------
      this.stats = [
        { title: 'Users', value: s.users.total, icon: '👤', color: '#007bff', route: '/admin/orders' },
        { title: 'Books', value: s.books.total, icon: '📚', color: '#ffc107', route: '/admin/inventory' },
        { title: 'Orders', value: s.orders.total, icon: '🧾', color: '#28a745', route: '/admin/books' },
        { title: 'Returns', value: s.returns.pending, icon: '🔁', color: '#dc3545', route: '/admin/returns' },
        { title: 'Payments', value: s.payments.totalRevenue, icon: '💰', color: '#17a2b8', route: '/admin/payments' },
        { title: 'Subscriptions', value: s.subscriptions.total, icon: '📅', color: '#6f42c1', route: '/admin/pricing' },
      ];

      // ---------- Chart Data ----------
      this.revenueData = res.data.charts.monthlyRevenue.items.map((m: any) => ({
        month: m.monthName,
        revenue: m.totalAmount,
      }));

      this.cd.detectChanges();

      // Render chart only in browser
      if (this.isBrowser) {
        setTimeout(() => this.renderChart(), 300);
      }
    },
    error: (err) => {
      console.error('Dashboard API Error:', err);
    },
  });
}


  // Chart.js rendering
  renderChart() {
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement | null;
    if (!canvas) return;

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.revenueData.map((d) => d.month),
        datasets: [
          {
            label: 'Revenue (AED)',
            data: this.revenueData.map((d) => d.revenue),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
