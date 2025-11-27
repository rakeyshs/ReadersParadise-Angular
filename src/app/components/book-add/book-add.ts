import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';

interface Book {
  id: number;
  isbn: string;
  title: string;
  description: string | null;
  pages: number;
  binding: string;
  imageUrl: string;
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

@Component({
  selector: 'app-book-add',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './book-add.html',
  styleUrls: ['./book-add.scss'],
})
export class BookAdd implements OnInit {
  books: Book[] = [];
  pagedBooks: Book[] = [];
  searchTerm: string = '';
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  totalCount: number = 0;
  loading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 🚀 API auto-load on route open
    this.loadBooks();
  }

  loadBooks(): void {
    this.loading = true;

    const url = 'https://primabi.co/api/v1/Books';

    this.http.get<any>(url).subscribe({
      next: (res) => {
        // ✅ Set all books immediately
        this.books = res?.data || [];

        // ✅ Calculate totals
        this.totalCount = this.books.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // ✅ Show first page instantly — no click required
        this.setPage(1);

        // ✅ Stop loader
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Book API error:', err);
        Swal.fire('Error', 'Failed to load books', 'error');
      },
    });
  }

  // 🔍 Handles pagination + search
  setPage(page: number) {
    this.currentPage = page;

    let filteredBooks = this.books;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filteredBooks = this.books.filter(
        (b) =>
          b.title.toLowerCase().includes(term) ||
          b.isbn.toLowerCase().includes(term) ||
          b.authors.some((a) => a.toLowerCase().includes(term))
      );
    }

    this.totalCount = filteredBooks.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);

    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedBooks = filteredBooks.slice(start, end);
  }

  prev() {
    if (this.currentPage > 1) this.setPage(this.currentPage - 1);
  }

  next() {
    if (this.currentPage < this.totalPages) this.setPage(this.currentPage + 1);
  }

  clearSearch() {
    this.searchTerm = '';
    this.setPage(1);
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
