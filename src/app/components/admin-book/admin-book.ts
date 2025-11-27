import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// ---------------- INTERFACES ----------------
interface Book {
  itemId: number;
  bookId: number;
  title: string;
  isbn: string;
  imageUrl: string;
  authors: string[];
  status: string;
  expectedReturnDate?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
}

interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface Order {
  orderId: number;
  orderNumber: string;
  status: string;
  orderDate: string;
  approvedDate?: string | null;
  deliveredDate?: string | null;
  returnDate?: string | null;
  deliveryAddress: string;
  notes?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  totalBooks: number;
  user: User;
  books: Book[];
}

@Component({
  selector: 'app-admin-book',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-book.html',
  styleUrls: ['./admin-book.scss'],
})
export class AdminBook implements OnInit {
  private readonly API_BASE = 'https://primabi.co/api/v1/admin/AdminOrders';

  orders: Order[] = [];
  loading = false;
  searchTerm = '';
  pageSizes = [5, 10, 20];
  pageSize = 10;
  currentPage = 1;
  expandedOrderIds = new Set<number>(); // Track expanded orders

  statusOptions = ['All', 'Pending', 'Approved', 'Rejected', 'Delivered', 'Completed', 'PartiallyReturned'];
  selectedStatus = 'All';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

ngOnInit(): void {
  if (typeof window !== 'undefined') {
    this.loadOrders();
  }
}

  getToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('token');
  }
  return null;
}

  /** Load all orders with optional status */
  loadOrders() {
 const token = this.getToken();
if (!token) {
  Swal.fire('Error', 'No authentication token found', 'error');
  return;
}

    this.loading = true;
    const statusParam = this.selectedStatus === 'All' ? '' : this.selectedStatus.toLowerCase();
    const url = `${this.API_BASE}?status=${statusParam}&page=1&pageSize=20`;

    this.http
      .get<{ data: { orders: Order[] } }>(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (res) => {
          this.orders = res?.data?.orders || [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Error', 'Failed to fetch orders', 'error');
          console.error('Error:', err);
        },
      });
  }

  /** Called when dropdown changes */
  onStatusChange() {
    this.currentPage = 1;
    this.loadOrders();
  }

  /** Generic action method */
  handleAction(orderId: number, action: string, successMsg: string) {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http
      .post(
        `${this.API_BASE}/${orderId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .subscribe({
        next: () => {
          Swal.fire('✅ Success', successMsg, 'success');
          this.loadOrders();
        },
        error: () => Swal.fire('❌ Error', `Failed to ${action} order`, 'error'),
      });
  }

  /** Individual actions */
  approveOrder(orderId: number) {
    this.handleAction(orderId, 'approve', 'Order approved successfully');
  }

  rejectOrder(orderId: number) {
    Swal.fire({
      title: 'Reject Order?',
      text: 'Please confirm rejection.',
      icon: 'warning',
      input: 'text',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      preConfirm: (reason) => {
        if (!reason) Swal.showValidationMessage('Rejection reason is required');
        return reason;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value;
        const token = localStorage.getItem('token');
        if (!token) return;

        this.http
          .post(
            `${this.API_BASE}/${orderId}/reject`,
            { rejectionReason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .subscribe({
            next: (res: any) => {
              Swal.fire('✅ Success', res?.message || 'Order rejected successfully', 'success');
              this.loadOrders();
            },
            error: () => Swal.fire('❌ Error', 'Failed to reject order', 'error'),
          });
      }
    });
  }

  deliverOrder(orderId: number) {
    this.handleAction(orderId, 'deliver', 'Order delivered successfully');
  }

  markOverdue(orderId: number) {
    this.handleAction(orderId, 'overdue', 'Order marked as overdue');
  }

  /** Filtering logic */
  get filteredOrders(): Order[] {
    const q = this.searchTerm.toLowerCase();
    return this.orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.user.name.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
  }

  /** Pagination logic */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedOrders(): Order[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  setPage(n: number): void {
    this.currentPage = Math.min(Math.max(n, 1), this.totalPages);
  }

  prev(): void {
    this.setPage(this.currentPage - 1);
  }
  
  next(): void {
    this.setPage(this.currentPage + 1);
  }
  
  clearSearch(): void {
    this.searchTerm = '';
    this.setPage(1);
  }

  /** Toggle order expansion */
  toggleOrder(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

// returnOrder(order: Order, book: Book) {
//   Swal.fire({
//     title: '📘 Return Book',
//     width: 650,
//     html: `
//       <div style="text-align:left; font-size:15px;">

//         <p><strong>Book:</strong> ${book.title}</p>

//         <!-- ONE LINE 4 FIELDS -->
//         <div style="display:flex; gap:10px; width:100%;">

//           <div style="flex:1;">
//             <label style="font-weight:600;">Condition *</label>
//             <select id="condition" class="swal2-input" style="width:100%;">
//               <option value="">Select condition</option>
//               <option value="1">Good</option>
//               <option value="2">Damaged</option>
//               <option value="3">Lost</option>
//             </select>
//           </div>

//           <div style="flex:1;">
//             <label style="font-weight:600;">Late Fee Per Day</label>
//             <input id="lateFeePerDay" type="number" class="swal2-input"
//                    placeholder="Late fee per day" style="width:100%;" />
//           </div>

//           <div style="flex:1;">
//             <label style="font-weight:600;">Damage Fee</label>
//             <input id="damageFee" type="number" class="swal2-input"
//                    placeholder="Damage fee" style="width:100%;" />
//           </div>

//           <div style="flex:1;">
//             <label style="font-weight:600;">Lost Book Fee</label>
//             <input id="lostBookFee" type="number" class="swal2-input"
//                    placeholder="Lost book fee" style="width:100%;" />
//           </div>

//         </div>

//         <!-- NOTES FULL WIDTH -->
//         <div style="margin-top:12px;">
//           <label style="font-weight:600;">Notes</label>
//           <textarea id="notes" class="swal2-textarea"
//                     placeholder="Write notes (optional)"
//                     style="height:80px;"></textarea>
//         </div>

//       </div>
//     `,
//     showCancelButton: true,
//     confirmButtonText: 'Process Return',
//     preConfirm: () => {
//       const condition = (document.getElementById('condition') as HTMLSelectElement).value;
//       const lateFeePerDay = (document.getElementById('lateFeePerDay') as HTMLInputElement).value;
//       const damageFee = (document.getElementById('damageFee') as HTMLInputElement).value;
//       const lostBookFee = (document.getElementById('lostBookFee') as HTMLInputElement).value;
//       const notes = (document.getElementById('notes') as HTMLTextAreaElement).value;

//       if (!condition) return Swal.showValidationMessage('Condition is required');

//       return {
//         condition: Number(condition),
//         lateFeePerDay: Number(lateFeePerDay || 0),
//         damageFee: Number(damageFee || 0),
//         lostBookFee: Number(lostBookFee || 0),
//         notes
//       };
//     }
//   });
// }




}