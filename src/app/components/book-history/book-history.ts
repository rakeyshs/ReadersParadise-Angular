import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';


interface BookHistory1 {
  id: number;
  user: string;
  book: string;
  issueDate: string;
  returnDate: string | null;
  status: string;
  bookId?: number;
}

interface Book {
  id: number;
  isbn: string;
  title: string;
  description: string | null;
  pages: number;
  binding: string;
  imageUrl: string;
    rentalCount?: number;  // ⭐ add this
  availableCopies: number;
  totalCopies: number;
  isBestSeller: boolean;
  isNewRelease: boolean;
  isAvailable: boolean;
  category: string;
  publisher: string;
  authors: string[];
  averageRating: number;
  reviewCount: number;
}
interface MostRentedBook {
  id: number;
  title: string;
  isbn?: string;
  rentalCount: number;
  bookId?: number;
  bookTitle?: string;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  bookCount: number;
}

interface RentalHistory {
  userId: string;
  userName: string;
  rentedDate: string;
  returnedDate: string | null;
  status: string;
}

interface BookRentalHistory {
  bookId: number;
  isbn: string;
  title: string;
  totalRentals: number;
  history: RentalHistory[];
}


@Component({
  selector: 'app-book-history',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './book-history.html',
  styleUrl: './book-history.scss',
})
export class BookHistory implements OnInit {
  // ---- config ----
  private apiUrl = 'https://primabi.co/api/v1';
  private token = 'PUT_YOUR_TOKEN_HERE'; // replace with secure token flow

  // ---- state ----
  books: BookHistory1[] = [];
  filteredBooks: BookHistory1[] = [];
  categories: Category[] = [];
  mostRentedBooks: Book[] = [];

  searchTerm = '';
  selectedCategory: number | null = null;
  selectedBookId: number | null = null;

  pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  pageSizes = [5, 10, 20, 50];

  loading = false;
  viewMode: 'all' | 'category' | 'mostRented' | 'bookHistory' = 'all';

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCategories();
    this.loadAllBooks();
  }

  // ------- helpers -------
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    });
  }

  private safeNumber(v: number | null | undefined, fallback = 0): number {
    return v === null || v === undefined ? fallback : v;
  }

  // ------- API calls -------
  loadCategories(): void {
    const url = `${this.apiUrl}/Books/categories`;
    this.http.get<any>(url, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        // defensive mapping: try response.data else response
        const data = res?.data ?? res;
        if (Array.isArray(data)) {
          this.categories = data as Category[];
        } else if (Array.isArray(data?.items)) {
          this.categories = data.items as Category[];
            this.cd.detectChanges(); 
        } else {
          // try to extract if API returns { data: { categories: [...] } }
          this.categories = data.categories ?? [];
        }
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
      },
    });
  }

  loadAllBooks(): void {
    this.loading = true;

    // Build params defensively
    let params = new HttpParams()
      .set('page', String(this.currentPage))
      .set('pageSize', String(this.pageSize));

    if (this.searchTerm && this.searchTerm.trim().length > 0) {
      params = params.set('search', this.searchTerm.trim());
    }

    if (this.selectedCategory !== null && this.selectedCategory !== undefined) {
      params = params.set('categoryId', String(this.selectedCategory));
    }

    const url = `${this.apiUrl}/Books`;
    this.http.get<any>(url, { headers: this.getHeaders(), params }).subscribe({
      next: (response) => {
        // response mapping is defensive (different APIs structure results differently)
        const payload = response?.data ?? response;
  this.cd.detectChanges(); 
        // find items array
        const items: any[] =
          Array.isArray(payload) && payload.length >= 0
            ? payload
            : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(payload?.books)
            ? payload.books
            : [];

        // map to BookHistory1 format
        this.books = items.map((book: any) => ({
          id: Number(book.id ?? book.bookId ?? 0),
          user: book.user ?? 'N/A',
          book: book.title ?? book.name ?? book.bookTitle ?? 'Unknown',
          issueDate: book.issueDate ?? 'N/A',
          returnDate: book.returnDate ?? null,
          status:
            book.isAvailable !== undefined
              ? book.isAvailable
                ? 'Available'
                : 'Rented'
              : book.status ?? 'Unknown',
          bookId: Number(book.id ?? book.bookId ?? null),
        }));

        // if API returned a total count, use it; else compute
        const totalFromApi =
          Number(response?.total ?? payload?.total ?? payload?.totalCount ?? response?.totalCount) || 0;

        if (totalFromApi > 0) {
          this.totalPages = Math.max(1, Math.ceil(totalFromApi / this.pageSize));
        } else {
          // fallback: compute pages from items length
          this.totalPages = Math.max(1, Math.ceil(this.books.length / this.pageSize));
        }

        // apply client-side filtering and pagination
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading books:', err);
        this.books = [];
        this.filteredBooks = [];
        this.totalPages = 0;
        this.loading = false;
      },
    });
  }

  loadBooksByCategory(categoryId: number | null): void {
    // Guard: if null => clear category filter and reload all
    if (categoryId === null) {
      this.selectedCategory = null;
      this.viewMode = 'all';
    } else {
      this.selectedCategory = categoryId;
      this.viewMode = 'category';
    }
    this.currentPage = 1;
    this.loadAllBooks();
      this.cd.detectChanges(); 
  }

  loadMostRentedBooks(): void {
    this.loading = true;
    this.viewMode = 'mostRented';
    const url = `${this.apiUrl}/admin/books/most-rented?top=100`;

    this.http.get<any>(url, { headers: this.getHeaders() }).subscribe({
      next: (response) => {
        const payload = response?.data ?? response;
        const items: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

        this.mostRentedBooks = items.map((b) => ({
          id: Number(b.id ?? b.bookId ?? 0),
          isbn: b.isbn ?? '',
          title: b.title ?? b.bookTitle ?? 'Unknown',
          description: b.description ?? null,
          pages: Number(b.pages ?? 0),
          binding: b.binding ?? '',
          imageUrl: b.imageUrl ?? '',
          availableCopies: Number(b.availableCopies ?? 0),
          totalCopies: Number(b.totalCopies ?? 0),
          isBestSeller: Boolean(b.isBestSeller ?? false),
          isNewRelease: Boolean(b.isNewRelease ?? false),
          isAvailable: Boolean(b.isAvailable ?? false),
          category: b.category ?? '',
          publisher: b.publisher ?? '',
          authors: b.authors ?? [],
          averageRating: Number(b.averageRating ?? 0),
          reviewCount: Number(b.reviewCount ?? 0),
        }));

        this.cd.detectChanges();

        // convert to BookHistory1 for display
        this.books = this.mostRentedBooks.map((book, index) => ({
          id: book.id || index,
          user: 'Multiple Users',
          book: book.title,
          issueDate: 'N/A',
          returnDate: null,
          status: `${(response?.rentalCount ?? book['rentalCount']) ?? 0} Rentals`,
          bookId: book.id,
        }));

        // pagination for client-side list
        this.currentPage = 1;
        this.totalPages = Math.max(1, Math.ceil(this.books.length / this.pageSize));
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading most rented books:', err);
        this.loading = false;
      },
    });
  }

  loadBookRentalHistory(bookId: number | null): void {
    // Guard against null/invalid id
    if (bookId === null || bookId === undefined || Number.isNaN(bookId)) {
      console.warn('loadBookRentalHistory called with null/invalid bookId:', bookId);
      return;
    }

    this.loading = true;
    this.selectedBookId = bookId;
    this.viewMode = 'bookHistory';
    this.currentPage = 1;

    const url = `${this.apiUrl}/admin/books/${bookId}/rental-history`;
    this.http.get<any>(url, { headers: this.getHeaders() }).subscribe({
      next: (response) => {
        const data: BookRentalHistory = response?.data ?? response;

        const historyArray = Array.isArray(data?.history) ? data.history : [];

        this.books = historyArray.map((rental, idx) => ({
          id: idx + 1,
          user: rental.userName ?? rental.userId ?? 'Unknown',
          book: data?.title ?? 'Unknown',
          issueDate: rental.rentedDate ? new Date(rental.rentedDate).toLocaleDateString('en-GB') : 'N/A',
          returnDate: rental.returnedDate ? new Date(rental.returnedDate).toLocaleDateString('en-GB') : null,
          status: rental.status ?? (rental.returnedDate ? 'Returned' : 'Pending'),
          bookId: data?.bookId ?? bookId,
        }));

        this.totalPages = Math.max(1, Math.ceil(this.books.length / this.pageSize));
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading rental history:', err);
        this.loading = false;
        this.books = [];
        this.filteredBooks = [];
      },
    });
  }

  // ------- filtering / pagination -------
  applyFilter(): void {
    const term = (this.searchTerm ?? '').toLowerCase().trim();

    const filtered = this.books.filter((b) => {
      if (!b) return false;
      const user = (b.user ?? '').toLowerCase();
      const book = (b.book ?? '').toLowerCase();
      const status = (b.status ?? '').toLowerCase();

      return user.includes(term) || book.includes(term) || status.includes(term);
    });

    // update total pages from filtered set
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    // reset page if currentPage > totalPages
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredBooks = filtered.slice(start, end);
  }

  clearSearch(): void {
    this.searchTerm = '';
    // re-apply filter (keeps current viewMode)
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.selectedBookId = null;
    this.viewMode = 'all';
    this.currentPage = 1;
    this.loadAllBooks();
  }

  setPage(page: number): void {
    // guard
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.applyFilter();
  }

  prev(): void {
    if (this.currentPage > 1) {
      this.setPage(this.currentPage - 1);
    }
  }

  next(): void {
    if (this.currentPage < this.totalPages) {
      this.setPage(this.currentPage + 1);
    }
  }

  get pages(): number[] {
    // return pages array with at least 1 page
    const length = Math.max(1, this.totalPages);
    return Array.from({ length }, (_, i) => i + 1);
  }
}