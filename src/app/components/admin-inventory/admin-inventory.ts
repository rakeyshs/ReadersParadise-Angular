import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Book {
  id: number;
  title: string;
  totalCopies: number;
  availableCopies: number;
  rentedCopies: number;
  minStock: number;
  location: string;
  isbn?: string;
  authors?: any[];
  pages?: number;
  binding?: string;
  category?: any;
  publisher?: any;
  imageUrl?: string;
  archived: boolean;
  description?: string;
  shelfLocation?: string;
}

interface Category {
  id: number;
  name: string;
}

export interface Author {
  id: number;
  name: string;
}

interface Publisher {
  id: number;
  name: string;
}

interface RentalHistory {
  orderId: number;
  orderNumber: string;
  userId: string;
  userName: string;
  rentedOn: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: string;
}

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    HttpClientModule, 
    MatButtonModule, 
    MatIconModule, 
    MatTooltipModule
  ],
  templateUrl: './admin-inventory.html',
  styleUrls: ['./admin-inventory.scss']
})
export class AdminInventory implements OnInit {
  books: Book[] = [];
  searchTerm = '';
  loading = false;
  publishers: Publisher[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  pageSizes = [5, 10, 20];
  pages: number[] = [];
  authors: Author[] = [];
  categories: Category[] = [];
  bookForm: FormGroup;
  selectedBookId: number | null = null;
  showBookModal: boolean = false;
  
  // New properties for Most Rented filter
  showMostRented: boolean = false;
  
  // New properties for Rental History modal
  showRentalHistoryModal: boolean = false;
  rentalHistory: RentalHistory[] = [];
  selectedBookTitle: string = '';
  selectedBookIsbn: string = '';
  totalRentals: number = 0;
  loadingHistory: boolean = false;

  private readonly API_URL = 'https://primabi.co/api/v1/Books';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      isbn: [''],
      description: [''],
      pages: [0, [Validators.required, Validators.min(1)]],
      binding: ['', Validators.required],
      imageUrl: ['', [Validators.required, Validators.pattern('https?://.+')]],
      shelfLocation: [''],
      totalCopies: [0, [Validators.required, Validators.min(1)]],
      availableCopies: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      categoryId: [0, [Validators.required, Validators.min(1)]],
      publisherId: [0, [Validators.required, Validators.min(1)]],
      authorId: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadPublishers();
    this.loadAuthors(); 
    this.loadInventory();
  }

  loadAuthors(): void {       
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Author[]>(`${this.API_URL}/authors`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => {
        this.authors = res;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load authors', 'error');
      }
    });
  }

  loadPublishers(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Publisher[]>(`${this.API_URL}/publishers`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => {
        this.publishers = res;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load publishers', 'error');
      }
    });
  }

  loadCategories(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Category[]>(`${this.API_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => this.categories = res,
      error: () => Swal.fire('Error', 'Failed to load categories', 'error')
    });
  }

  loadInventory(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;
    const params: any = { page: this.currentPage, pageSize: this.pageSize };
    if (this.searchTerm.trim()) params.search = this.searchTerm;

    this.http.get<{ data: any[]; totalCount: number }>(this.API_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params
    }).subscribe({
      next: res => {
        const result = res?.data || [];
        this.books = result.map(b => this.mapApiToBook(b));
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'Failed to load books', 'error');
      }
    });
  }

  // Load Most Rented Books
  loadMostRented(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;
    this.showMostRented = true;

    this.http.get<{ success: boolean; data: any[]; total: number }>(
      'https://primabi.co/api/v1/admin/books/most-rented?top=50',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.books = res.data.map((item: any) => ({
            id: item.bookId,
            title: item.title,
            isbn: item.isbn,
            totalCopies: 0,
            availableCopies: 0,
            rentedCopies: item.totalRentals,
            minStock: 0,
            location: '-',
            authors: item.authors?.map((name: string) => ({ name })) || [],
            category: { name: item.category },
            archived: false
          }));
          this.totalCount = res.total || 0;
          this.totalPages = 1;
          this.pages = [1];
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.showMostRented = false;
        Swal.fire('Error', 'Failed to load most rented books', 'error');
      }
    });
  }

  // Clear Most Rented filter and reload normal inventory
  clearMostRentedFilter(): void {
    this.showMostRented = false;
    this.currentPage = 1;
    this.loadInventory();
  }

  // View Rental History
  viewRentalHistory(book: Book, event?: any): void {
    if (event) event.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) return;

    this.selectedBookId = book.id;
    this.selectedBookTitle = book.title;
    this.selectedBookIsbn = book.isbn || '';
    this.loadingHistory = true;
    this.showRentalHistoryModal = true;

    this.http.get<{ success: boolean; data: any }>(
      `https://primabi.co/api/v1/admin/books/${book.id}/rental-history`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.rentalHistory = res.data.history || [];
          this.totalRentals = res.data.totalRentals || 0;
        }
        this.loadingHistory = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingHistory = false;
        Swal.fire('Error', 'Failed to load rental history', 'error');
      }
    });
  }

  // Close Rental History Modal
  closeRentalHistoryModal(): void {
    this.showRentalHistoryModal = false;
    this.rentalHistory = [];
    this.selectedBookId = null;
    this.selectedBookTitle = '';
    this.selectedBookIsbn = '';
    this.totalRentals = 0;
  }

  private mapApiToBook(apiBook: any): any {
    // Map API authors to your form's expected structure
    const authors = Array.isArray(apiBook.authors)
      ? apiBook.authors.map((a: any) => {
          if (typeof a === 'string') return { id: 0, name: a };
          return { id: a.id || 0, name: a.name || '' };
        })
      : [];

    // Category is a STRING from API (not an object)
    const category = typeof apiBook.category === 'string' 
      ? apiBook.category 
      : (apiBook.category?.name || '');

    // Publisher is a STRING from API (not an object)
    const publisher = typeof apiBook.publisher === 'string'
      ? apiBook.publisher
      : (apiBook.publisher?.name || '');

    return {
      id: apiBook.id,
      title: apiBook.title || '',
      isbn: apiBook.isbn || '',
      description: apiBook.description || '',
      pages: apiBook.pages || 0,
      binding: apiBook.binding || '',
      imageUrl: apiBook.imageUrl || '',
      shelfLocation: apiBook.shelfLocation || '',
      totalCopies: apiBook.totalCopies || 0,
      availableCopies: apiBook.availableCopies || 0,
      minStock: apiBook.minStock || 0,
      rentedCopies: (apiBook.totalCopies || 0) - (apiBook.availableCopies || 0),
      category,
      publisher,
      authors,
      archived: apiBook.archived || false,
    };
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadInventory();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadInventory();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadInventory();
  }

  prev(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInventory();
    }
  }

  next(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadInventory();
    }
  }

  refresh(): void {
    if (this.showMostRented) {
      this.loadMostRented();
    } else {
      this.loadInventory();
    }
  }

  openAddBookModal(): void {
    this.selectedBookId = null;
    this.bookForm.reset({
      title: '',
      isbn: '',
      description: '',
      pages: 0,
      binding: '',
      imageUrl: '',
      shelfLocation: '',
      totalCopies: 0,
      availableCopies: 0,
      minStock: 0,
      categoryId: 0,
      publisherId: 0,
      authorId: 0
    });
    this.showBookModal = true;
  }

  editBook(book: any, event?: any) {
    if (event) event.stopPropagation();

    this.selectedBookId = book.id;

    // Wait for dropdowns to be loaded
    setTimeout(() => {
      // Category matching - API returns STRING
      let categoryId = 0;
      if (book.category) {
        const categoryName = typeof book.category === 'string' ? book.category : book.category.name;
        const category = this.categories.find(c => c.name === categoryName);
        categoryId = category ? category.id : 0;
      }

      // Publisher matching - API returns STRING
      let publisherId = 0;
      if (book.publisher) {
        const publisherName = typeof book.publisher === 'string' ? book.publisher : book.publisher.name;
        const publisher = this.publishers.find(p => p.name === publisherName);
        publisherId = publisher ? publisher.id : 0;
      }

      // Author matching - API returns ARRAY of STRINGS
      let authorId = 0;
      if (book.authors && book.authors.length > 0) {
        const firstAuthor = book.authors[0];
        const authorName = typeof firstAuthor === 'string' ? firstAuthor : firstAuthor.name;
        const author = this.authors.find(a => a.name === authorName);
        authorId = author ? author.id : 0;
      }

      this.bookForm.patchValue({
        title: book.title || '',
        isbn: book.isbn || '',
        description: book.description || '',
        pages: book.pages || 0,
        binding: book.binding || '',
        imageUrl: book.imageUrl || '',
        shelfLocation: book.shelfLocation || '',
        totalCopies: book.totalCopies || 0,
        availableCopies: book.availableCopies || 0,
        minStock: book.minStock || 0,
        categoryId: categoryId,
        publisherId: publisherId,
        authorId: authorId
      });

      this.showBookModal = true;
      this.cdr.markForCheck();
    }, 150);
  }

  submitBook(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.bookForm.controls).forEach(key => {
      this.bookForm.get(key)?.markAsTouched();
    });

    if (this.bookForm.invalid) {
      Swal.fire('Validation Error', 'Please fill all required fields correctly', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.selectedBookId) {
      // Edit book payload
      const payloadEdit = {
        title: this.bookForm.value.title,
        description: this.bookForm.value.description,
        imageUrl: this.bookForm.value.imageUrl,
        categoryId: this.bookForm.value.categoryId,
        publisherId: this.bookForm.value.publisherId,
        totalCopies: this.bookForm.value.totalCopies,
        authorIds: [this.bookForm.value.authorId],
        isbn: this.bookForm.value.isbn,
        pages: this.bookForm.value.pages,
        binding: this.bookForm.value.binding,
        shelfLocation: this.bookForm.value.shelfLocation,
        availableCopies: this.bookForm.value.availableCopies
      };

      this.http.post(
        `https://primabi.co/api/v1/admin/books/${this.selectedBookId}/update`,
        payloadEdit,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res: any) => {
          if (res.success) {
            Swal.fire('Success', 'Book updated successfully', 'success');
            this.loadInventory();
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Update error:', err);
          Swal.fire('Error', err?.error?.message || 'Failed to update book', 'error');
        }
      });

    } else {
      // Add book payload
      const payloadAdd = {
        title: this.bookForm.value.title,
        description: this.bookForm.value.description,
        imageUrl: this.bookForm.value.imageUrl,
        categoryId: this.bookForm.value.categoryId,
        publisherId: this.bookForm.value.publisherId,
        totalCopies: this.bookForm.value.totalCopies,
        isNewRelease: true,
        isActive: true
      };

      this.http.post(
        `https://primabi.co/api/v1/admin/books`,
        payloadAdd,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res: any) => {
          if (res.success) {
            Swal.fire('Success', 'Book added successfully', 'success');
            this.loadInventory();
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Add error:', err);
          Swal.fire('Error', err?.error?.message || 'Failed to add book', 'error');
        }
      });
    }
  }

  closeModal(): void {
    this.showBookModal = false;
    this.selectedBookId = null;
    this.bookForm.reset();
  }

  exportBooks(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get(`https://primabi.co/api/v1/admin/books/export`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.]/g, '');
        a.download = `books-${timestamp}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        Swal.fire('Success', 'Books exported successfully', 'success');
      },
      error: () => Swal.fire('Error', 'Failed to export books', 'error')
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.importBooks(file);
    }
    event.target.value = '';
  }

  importBooks(file: File): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);

    this.http.post(`https://primabi.co/api/v1/admin/books/import`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        Swal.fire('Import Result', res.message || 'Import completed', 'success');
        this.loadInventory();
      },
      error: (err) => {
        console.error('Import error:', err);
        Swal.fire('Error', err?.error?.message || 'Failed to import books', 'error');
      }
    });
  }

  toggleArchive(book: Book): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = book.archived
      ? `https://primabi.co/api/v1/admin/books/${book.id}/unarchive`
      : `https://primabi.co/api/v1/admin/books/${book.id}/archive`;

    this.http.post(url, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        Swal.fire('Success', res.message || (book.archived ? 'Book unarchived' : 'Book archived'), 'success');
        book.archived = !book.archived;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Archive error:', err);
        Swal.fire('Error', err?.error?.message || 'Failed to update book status', 'error');
      }
    });
  }

  // Helper method to get validation error message
  getErrorMessage(fieldName: string): string {
    const control = this.bookForm.get(fieldName);
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['min']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
    }
    if (control.errors['pattern']) {
      return `${this.getFieldLabel(fieldName)} must be a valid URL`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Book Title',
      isbn: 'ISBN',
      description: 'Description',
      pages: 'Pages',
      binding: 'Binding',
      imageUrl: 'Image URL',
      shelfLocation: 'Location',
      totalCopies: 'Total Copies',
      availableCopies: 'Available Copies',
      minStock: 'Min Stock',
      categoryId: 'Category',
      publisherId: 'Publisher',
      authorId: 'Author'
    };
    return labels[fieldName] || fieldName;
  }
}