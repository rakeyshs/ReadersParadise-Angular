import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';


interface ReturnEntry {
  orderItemId: number;
  orderNumber: string;
  bookTitle: string;
  memberName: string;
  deliveredDate?: string;
  expectedReturnDate?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
    // add this property
  condition?: 'Good' | 'Damaged' | 'Lost';
  calculatedLateFee?: number;
}

interface ReturnProcessModel {
  condition: 'Good' | 'Damaged' | 'Lost';
  lateFeePerDay: number;
  damageFee: number;
  lostBookFee: number;
  notes: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-returns',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,MatButtonModule],
  templateUrl: './admin-returns.html',
  styleUrls: ['./admin-returns.scss'],
})
export class AdminReturns implements OnInit {

  returns: ReturnEntry[] = [];
  filteredReturns: ReturnEntry[] = [];
  searchTerm = '';
  loading = false;

  activeTab: 'pending' | 'history' = 'history';
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  pages: number[] = [];

  processForm!: FormGroup;
  selectedReturn: ReturnEntry | null = null;
  showModal = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchReturns();
  }

  initForm() {
    this.processForm = this.fb.group({
      condition: ['Good', Validators.required],
      lateFeePerDay: [0, [Validators.required, Validators.min(0)]],
      damageFee: [0, [Validators.min(0)]],
      lostBookFee: [0, [Validators.min(0)]],
      notes: ['']
    });
  }

  setTab(tab: 'pending' | 'history') {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.currentPage = 1;
      this.fetchReturns();
    }
  }

fetchReturns() {
  const token = localStorage.getItem('token');
  if (!token) return;

  this.loading = true;
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  const url = this.activeTab === 'pending'
    ? `https://primabi.co/api/v1/admin/returns/pending?page=${this.currentPage}&pageSize=${this.pageSize}`
    : `https://primabi.co/api/v1/admin/returns/history?page=${this.currentPage}&pageSize=${this.pageSize}`;

  this.http.get<any>(url, { headers }).subscribe({
    next: res => {
      this.returns = res.data || [];
      this.filteredReturns = [...this.returns];

      // Pagination
      this.totalPages = res.pagination?.totalPages || 1;
      this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

      this.loading = false;
      this.cd.detectChanges();
    },
    error: () => {
      this.loading = false;
      Swal.fire('Error', 'Failed to load returns', 'error');
    }
  });
}
pageSizes: number[] = [5, 10, 20, 50]; // example sizes

onPageSizeChange() {
  this.currentPage = 1; // reset to first page
  this.fetchReturns();   // refetch from API with new pageSize
}

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredReturns = this.returns.filter(
      r => r.bookTitle.toLowerCase().includes(term) || r.memberName.toLowerCase().includes(term)
    );
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }



  setPage(page: number) {
  if (page < 1 || page > this.totalPages) return; // safety
  this.currentPage = page;
  this.fetchReturns();
}

next() {
  if (this.currentPage < this.totalPages) {
    this.setPage(this.currentPage + 1);
  }
}

prev() {
  if (this.currentPage > 1) {
    this.setPage(this.currentPage - 1);
  }
}

  
  // ================= OPEN MODAL =================
  openReturnModal(entry: ReturnEntry) {
    this.selectedReturn = entry;
    this.processForm.reset({
      condition: 'Good',
      lateFeePerDay: entry.calculatedLateFee || 0,
      damageFee: 0,
      lostBookFee: 0,
      notes: ''
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    setTimeout(() => this.processForm.reset(), 50);
  }

  // ================= PROCESS RETURN =================
  processReturn() {
    if (!this.selectedReturn || this.processForm.invalid) {
      this.processForm.markAllAsTouched();
      return;
    }

    const formValue = this.processForm.value;
    const body = {
      ...formValue,
      condition: formValue.condition === 'Damaged' ? 2 : formValue.condition === 'Lost' ? 3 : 1
    };

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

    this.http.post(
      `https://primabi.co/api/v1/admin/returns/${this.selectedReturn.orderItemId}/process`,
      body,
      { headers }
    ).subscribe({
      next: () => {
        Swal.fire('Success', 'Return processed successfully', 'success');
        this.fetchReturns();
        this.closeModal();
      },
      error: () => Swal.fire('Error', 'Failed to process return', 'error')
    });
  }

  isInvalid(field: string) {
    return this.processForm.get(field)?.invalid && this.processForm.get(field)?.touched;
  }
}