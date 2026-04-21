import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
  isBestSeller?: boolean;
  isNewRelease?: boolean;
  rentedCount?: number;        // ✅ raw value from API
  averageRating?: number;
  reviewCount?: number;
}

interface Category {
  id: number;
  name: string;
  subCategories?: Category[];
}

interface CategoryDropdownItem {
  id: number;
  name: string;
  isSubCategory: boolean;
  subCount?: number;
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
    MatTooltipModule,
    MatSlideToggleModule
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
  pageSizes = [5, 10, 20, 100, 500, 1000];
  pages: number[] = [];
  authors: Author[] = [];
  categories: Category[] = [];
  allCategories: Category[] = [];
  bookForm: FormGroup;
  selectedBookId: number | null = null;
  showBookModal: boolean = false;

  selectedCategoryId: number = 0;
  showNewReleases: boolean = false;
  showBestSellers: boolean = false;
  showMostRented: boolean = false;

  showRentalHistoryModal: boolean = false;
  rentalHistory: RentalHistory[] = [];
  selectedBookTitle: string = '';
  selectedBookIsbn: string = '';
  totalRentals: number = 0;
  loadingHistory: boolean = false;

  categorySearch: string = '';
  authorSearch: string = '';
  publisherSearch: string = '';
  showCategoryDropdown: boolean = false;
  showAuthorDropdown: boolean = false;
  showPublisherDropdown: boolean = false;

  categoryTouched: boolean = false;
  selectedAuthors: Author[] = [];

  showImportModal: boolean = false;
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // ✅ FIX: store rentedCount directly from API — no subtraction math
  private currentBookRentedCount: number = 0;

  private readonly API_URL = 'https://primabi.co/api/v1/Books';
  private readonly ADMIN_API_URL = 'https://primabi.co/api/v1/admin/books';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      isbn: [''],
      description: [''],
      pages: [0],
      binding: [''],
      imageUrl: [''],
      shelfLocation: [''],
      totalCopies: [0, [Validators.required, Validators.min(1)]],
      availableCopies: [0],
      minStock: [0],
      categoryId: [0],
      publisherId: [0],
      isBestSeller: [false],
      isNewRelease: [false]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadPublishers();
    this.loadAuthors();
    this.loadInventory();
  }

  // ===== HIERARCHICAL CATEGORY DROPDOWN =====

  getCategoryDropdownItems(): CategoryDropdownItem[] {
    const items: CategoryDropdownItem[] = [];
    if (!this.categories || this.categories.length === 0) return items;

    const search = this.categorySearch.trim().toLowerCase();

    for (const cat of this.categories) {
      const catMatches = !search || cat.name.toLowerCase().includes(search);
      const matchingSubs = (cat.subCategories || []).filter(
        sub => !search || sub.name.toLowerCase().includes(search)
      );

      if (catMatches || matchingSubs.length > 0) {
        const subsToShow = !search
          ? (cat.subCategories || [])
          : catMatches && matchingSubs.length === 0
            ? (cat.subCategories || [])
            : matchingSubs;

        items.push({
          id: cat.id,
          name: cat.name,
          isSubCategory: false,
          subCount: subsToShow.length
        });

        for (const sub of subsToShow) {
          items.push({
            id: sub.id,
            name: sub.name,
            isSubCategory: true
          });
        }
      }
    }

    return items;
  }

  onCategorySearchInput(): void {
    if (!this.categorySearch.trim()) {
      this.bookForm.patchValue({ categoryId: 0 });
    }
    this.showCategoryDropdown = true;
  }

  selectCategory(item: CategoryDropdownItem): void {
    this.bookForm.patchValue({ categoryId: item.id });
    this.categorySearch = item.name;
    this.showCategoryDropdown = false;
    this.categoryTouched = true;
  }

  onCategoryBlur(): void {
    setTimeout(() => {
      this.showCategoryDropdown = false;
      this.categoryTouched = true;
      const currentId = this.bookForm.get('categoryId')?.value;
      if (!currentId || currentId === 0) {
        this.categorySearch = '';
      }
    }, 200);
  }

  clearCategory(): void {
    this.bookForm.patchValue({ categoryId: 0 });
    this.categorySearch = '';
    this.categoryTouched = true;
  }

  getSelectedCategoryName(): string {
    const id = this.bookForm.get('categoryId')?.value;
    if (!id || !this.allCategories || this.allCategories.length === 0) return '';
    const category = this.allCategories.find(c => c.id === id);
    return category ? category.name : '';
  }

  getActiveCategoryName(): string {
    if (!this.selectedCategoryId || !this.allCategories || this.allCategories.length === 0) return '';
    const category = this.allCategories.find(c => c.id === this.selectedCategoryId);
    return category ? category.name : '';
  }

  // ===== AUTHORS =====

  get filteredAuthors(): Author[] {
    if (!this.authors || this.authors.length === 0) return [];
    if (!this.authorSearch.trim()) return this.authors;
    const search = this.authorSearch.toLowerCase();
    return this.authors.filter(a => a.name.toLowerCase().includes(search));
  }

  selectAuthor(author: Author): void {
    if (!author || !this.selectedAuthors) return;
    if (!this.selectedAuthors.find(a => a.id === author.id)) {
      this.selectedAuthors.push(author);
    }
    this.authorSearch = '';
    this.showAuthorDropdown = false;
  }

  removeAuthor(author: Author): void {
    if (!author || !this.selectedAuthors) return;
    this.selectedAuthors = this.selectedAuthors.filter(a => a.id !== author.id);
  }

  onAuthorBlur(): void {
    setTimeout(() => {
      this.showAuthorDropdown = false;
    }, 200);
  }

  clearAllAuthors(): void {
    this.selectedAuthors = [];
    this.authorSearch = '';
  }

  // ===== PUBLISHERS =====

  get filteredPublishers(): Publisher[] {
    if (!this.publishers || this.publishers.length === 0) return [];
    if (!this.publisherSearch.trim()) return this.publishers;
    const search = this.publisherSearch.toLowerCase();
    return this.publishers.filter(p => p.name.toLowerCase().includes(search));
  }

  selectPublisher(publisher: Publisher): void {
    this.bookForm.patchValue({ publisherId: publisher.id });
    this.publisherSearch = publisher.name;
    this.showPublisherDropdown = false;
  }

  onPublisherBlur(): void {
    setTimeout(() => {
      this.showPublisherDropdown = false;
    }, 200);
  }

  clearPublisher(): void {
    this.bookForm.patchValue({ publisherId: 0 });
    this.publisherSearch = '';
  }

  getSelectedPublisherName(): string {
    const id = this.bookForm.get('publisherId')?.value;
    if (!id || !this.publishers || this.publishers.length === 0) return '';
    const publisher = this.publishers.find(p => p.id === id);
    return publisher ? publisher.name : '';
  }

  // ===== COPIES LOGIC =====

  // ✅ FIX: Use rentedCount from API directly — no subtraction
  onTotalCopiesChange(): void {
    if (this.selectedBookId) {
      const newTotal = this.bookForm.get('totalCopies')?.value || 0;
      // Use rentedCount from API, NOT totalCopies - availableCopies
      if (this.currentBookRentedCount > 0 && newTotal < this.currentBookRentedCount) {
        this.showErrorWithHighZIndex(
          `Total copies cannot be less than copies currently rented or reserved (${this.currentBookRentedCount})`
        );
        this.bookForm.patchValue(
          { totalCopies: this.bookForm.get('totalCopies')?.value },
          { emitEvent: false }
        );
      }
    }
  }

  // ===== DATA LOADING =====

  loadAuthors(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Author[]>(`${this.API_URL}/authors`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => { this.authors = res || []; },
      error: () => {
        this.authors = [];
        this.showErrorWithHighZIndex('Failed to load authors');
      }
    });
  }

  loadPublishers(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Publisher[]>(`${this.API_URL}/publishers`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => { this.publishers = res || []; },
      error: () => {
        this.publishers = [];
        this.showErrorWithHighZIndex('Failed to load publishers');
      }
    });
  }

  loadCategories(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Category[]>(`${this.API_URL}/categories?hierarchical=true`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: res => {
        this.categories = res || [];
        this.allCategories = this.flattenCategories(this.categories);
      },
      error: () => {
        this.categories = [];
        this.allCategories = [];
        this.showErrorWithHighZIndex('Failed to load categories');
      }
    });
  }

  private flattenCategories(categories: Category[]): Category[] {
    if (!categories || categories.length === 0) return [];
    let result: Category[] = [];
    for (const cat of categories) {
      result.push({ id: cat.id, name: cat.name });
      if (cat.subCategories && cat.subCategories.length > 0) {
        result = result.concat(this.flattenCategories(cat.subCategories));
      }
    }
    return result;
  }

  // ===== FILTERS & INVENTORY =====

  onCategoryFilterChange(event: any): void {
    this.selectedCategoryId = +event.target.value;
    this.showNewReleases = false;
    this.showBestSellers = false;
    this.showMostRented = false;
    this.currentPage = 1;
    this.loadInventory();
  }

  loadNewReleases(): void {
    this.selectedCategoryId = 0;
    this.showNewReleases = true;
    this.showBestSellers = false;
    this.showMostRented = false;
    this.currentPage = 1;
    this.loadInventory();
  }

  loadBestSellers(): void {
    this.selectedCategoryId = 0;
    this.showNewReleases = false;
    this.showBestSellers = true;
    this.showMostRented = false;
    this.currentPage = 1;
    this.loadInventory();
  }

  clearAllFilters(): void {
    this.selectedCategoryId = 0;
    this.showNewReleases = false;
    this.showBestSellers = false;
    this.showMostRented = false;
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadInventory();
  }

  loadInventory(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;

    if (this.showNewReleases || this.showBestSellers) {
      const params: any = {
        sortBy: 'title',
        sortOrder: 'asc',
        page: this.currentPage,
        pageSize: this.pageSize
      };
      if (this.showNewReleases) params.newReleases = true;
      if (this.showBestSellers) params.bestSellers = true;
      if (this.searchTerm.trim()) params.search = this.searchTerm.trim();

      this.http.get<{ data: any[]; totalCount: number; page: number; pageSize: number; totalPages: number }>(
        `${this.API_URL}/search`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      ).subscribe({
        next: res => {
          this.books = res.data.map(b => this.mapApiToBook(b));
          this.totalCount = res.totalCount || 0;
          this.totalPages = res.totalPages || Math.ceil(this.totalCount / this.pageSize);
          this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.showErrorWithHighZIndex('Failed to load books');
        }
      });
    } else {
      const params: any = { page: this.currentPage, pageSize: this.pageSize };
      if (this.searchTerm.trim()) params.search = this.searchTerm.trim();
      if (this.selectedCategoryId > 0) params.categoryId = this.selectedCategoryId;

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
          this.showErrorWithHighZIndex('Failed to load books');
        }
      });
    }
  }

  loadMostRented(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;
    this.showMostRented = true;
    this.showNewReleases = false;
    this.showBestSellers = false;
    this.selectedCategoryId = 0;

    this.http.get<{ success: boolean; data: any[]; total: number }>(
      `${this.ADMIN_API_URL}/most-rented?top=50`,
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
            category: item.category,
            publisher: '',
            archived: false,
            description: '',
            rentedCount: item.totalRentals
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
        this.showErrorWithHighZIndex('Failed to load most rented books');
      }
    });
  }

  // ===== RENTAL HISTORY =====

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
      `${this.ADMIN_API_URL}/${book.id}/rental-history`,
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
        this.showErrorWithHighZIndex('Failed to load rental history');
      }
    });
  }

  closeRentalHistoryModal(): void {
    this.showRentalHistoryModal = false;
    this.rentalHistory = [];
    this.selectedBookId = null;
    this.selectedBookTitle = '';
    this.selectedBookIsbn = '';
    this.totalRentals = 0;
  }

  // ===== API MAPPING =====

  private mapApiToBook(apiBook: any): Book {
    const authors = Array.isArray(apiBook.authors)
      ? apiBook.authors.map((a: any) => {
          if (typeof a === 'string') return { id: 0, name: a };
          return { id: a.id || 0, name: a.name || '' };
        })
      : [];

    const category = typeof apiBook.category === 'string'
      ? apiBook.category
      : (apiBook.category?.name || '');

    const publisher = typeof apiBook.publisher === 'string'
      ? apiBook.publisher
      : (apiBook.publisher?.name || '');

    const totalCopies = apiBook.totalCopies ?? apiBook.availableCopies ?? 0;
    const availableCopies = apiBook.availableCopies ?? 0;

    // ✅ FIX: Use rentedCount from API directly. Never calculate from totalCopies - availableCopies.
    const rentedCount = apiBook.rentedCount ?? 0;

    return {
      id: apiBook.id,
      title: apiBook.title || '',
      isbn: apiBook.isbn || '',
      description: apiBook.description || '',
      pages: apiBook.pages || 0,
      binding: apiBook.binding || '',
      imageUrl: apiBook.imageUrl || '',
      shelfLocation: apiBook.shelfLocation || '',
      totalCopies,
      availableCopies,
      minStock: apiBook.minStock || 0,
      rentedCopies: rentedCount,    // ✅ display value = API rentedCount
      rentedCount,                  // ✅ raw API value stored for validation
      category,
      publisher,
      authors,
      archived: apiBook.archived || false,
      isBestSeller: apiBook.isBestSeller || false,
      isNewRelease: apiBook.isNewRelease || false,
      averageRating: apiBook.averageRating || 0,
      reviewCount: apiBook.reviewCount || 0,
      location: apiBook.shelfLocation || ''
    };
  }

  // ===== SEARCH & PAGINATION =====

  applyFilter(): void {
    this.currentPage = 1;
    this.loadInventory();
  }

  onSearchInput(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.clearSearch();
    }
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
    this.loadInventory();
  }

  // ===== MODAL OPEN/CLOSE =====

  openAddBookModal(): void {
    this.selectedBookId = null;
    this.currentBookRentedCount = 0;    // ✅ reset
    this.selectedAuthors = [];
    this.categoryTouched = false;
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
      isBestSeller: false,
      isNewRelease: false
    });
    this.categorySearch = '';
    this.authorSearch = '';
    this.publisherSearch = '';
    this.showBookModal = true;
  }

  editBook(book: any, event?: any): void {
    if (event) event.stopPropagation();

    this.selectedBookId = book.id;

    // ✅ FIX: Store rentedCount directly from API — no math
    this.currentBookRentedCount = book.rentedCount ?? 0;

    this.categoryTouched = false;
    this.categorySearch = '';
    this.publisherSearch = '';
    this.authorSearch = '';
    this.selectedAuthors = [];

    setTimeout(() => {
      // ── Category ──
      let categoryId = 0;
      if (book.category) {
        const categoryName = typeof book.category === 'string'
          ? book.category
          : (book.category?.name || '');
        if (categoryName) {
          const found = this.allCategories.find(
            c => c.name.toLowerCase() === categoryName.toLowerCase()
          );
          categoryId = found ? found.id : 0;
          this.categorySearch = found ? found.name : categoryName;
        }
      }

      // ── Publisher ──
      let publisherId = 0;
      if (book.publisher) {
        const publisherName = typeof book.publisher === 'string'
          ? book.publisher
          : (book.publisher?.name || '');
        if (publisherName) {
          const found = this.publishers.find(
            p => p.name.toLowerCase() === publisherName.toLowerCase()
          );
          publisherId = found ? found.id : 0;
          this.publisherSearch = found ? found.name : publisherName;
        }
      }

      // ── Authors ──
      this.selectedAuthors = [];
      if (book.authors && book.authors.length > 0) {
        book.authors.forEach((author: any) => {
          const authorName = typeof author === 'string' ? author : (author?.name || '');
          if (!authorName) return;

          if (author.id && author.id > 0) {
            const found = this.authors.find(a => a.id === author.id);
            if (found && !this.selectedAuthors.find(s => s.id === found.id)) {
              this.selectedAuthors.push(found);
              return;
            }
          }

          const found = this.authors.find(
            a => a.name.toLowerCase() === authorName.toLowerCase()
          );
          if (found && !this.selectedAuthors.find(s => s.id === found.id)) {
            this.selectedAuthors.push(found);
          }
        });
      }

      // ── Patch form ──
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
        categoryId,
        publisherId,
        isBestSeller: book.isBestSeller || false,
        isNewRelease: book.isNewRelease || false
      });

      this.showBookModal = true;
      this.cdr.markForCheck();
    }, 150);
  }

  closeModal(): void {
    this.showBookModal = false;
    this.selectedBookId = null;
    this.currentBookRentedCount = 0;    // ✅ reset
    this.selectedAuthors = [];
    this.categoryTouched = false;
    this.bookForm.reset();
    this.categorySearch = '';
    this.authorSearch = '';
    this.publisherSearch = '';
  }

  // ===== SUBMIT BOOK =====

  submitBook(): void {
    const titleControl = this.bookForm.get('title');
    const totalCopiesControl = this.bookForm.get('totalCopies');

    titleControl?.markAsTouched();
    totalCopiesControl?.markAsTouched();
    this.categoryTouched = true;

    const categoryId = this.bookForm.get('categoryId')?.value;
    const isCategoryValid = categoryId && categoryId > 0;

    if (titleControl?.invalid || totalCopiesControl?.invalid || !isCategoryValid) {
      this.showErrorWithHighZIndex('Please fill Book Title, Total Copies, and Category correctly');
      return;
    }

    const totalCopies = this.bookForm.value.totalCopies || 0;
    const availableCopies = this.bookForm.value.availableCopies || 0;

    if (this.selectedBookId) {
      // ✅ FIX: Validate against API rentedCount directly — no subtraction
      if (this.currentBookRentedCount > 0 && totalCopies < this.currentBookRentedCount) {
        this.showErrorWithHighZIndex(
          `Total copies cannot be less than copies currently rented or reserved (${this.currentBookRentedCount})`
        );
        return;
      }

      if (availableCopies > totalCopies) {
        this.showErrorWithHighZIndex('Available copies cannot exceed total copies');
        return;
      }

      if (availableCopies < 0) {
        this.showErrorWithHighZIndex('Available copies cannot be negative');
        return;
      }
    } else {
      // Add mode
      if (availableCopies > totalCopies) {
        this.showErrorWithHighZIndex('Available copies cannot exceed total copies');
        return;
      }
      if (availableCopies < 0) {
        this.showErrorWithHighZIndex('Available copies cannot be negative');
        return;
      }
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const authorIds = this.selectedAuthors.map(a => a.id);

    if (this.selectedBookId) {
      // ── EDIT MODE ──
      const payloadEdit = {
        title: this.bookForm.value.title,
        isbn: this.bookForm.value.isbn,
        description: this.bookForm.value.description,
        pages: this.bookForm.value.pages,
        binding: this.bookForm.value.binding,
        imageUrl: this.bookForm.value.imageUrl,
        shelfLocation: this.bookForm.value.shelfLocation,
        categoryId: this.bookForm.value.categoryId,
        publisherId: this.bookForm.value.publisherId,
        authorIds,
        totalCopies: this.bookForm.value.totalCopies,
        availableCopies: this.bookForm.value.availableCopies,
        minStock: this.bookForm.value.minStock,
        isNewRelease: this.bookForm.value.isNewRelease,
        isBestSeller: this.bookForm.value.isBestSeller,
        isActive: true
      };

      this.http.post(
        `${this.ADMIN_API_URL}/${this.selectedBookId}/update`,
        payloadEdit,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.showSuccessWithHighZIndex('Book updated successfully');
            this.loadInventory();
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Update error:', err);
          this.showErrorWithHighZIndex(err?.error?.message || 'Failed to update book');
        }
      });

    } else {
      // ── ADD MODE ──
      const payloadAdd = {
        isbn: this.bookForm.value.isbn,
        title: this.bookForm.value.title,
        description: this.bookForm.value.description,
        pages: this.bookForm.value.pages,
        binding: this.bookForm.value.binding,
        imageUrl: this.bookForm.value.imageUrl,
        shelfLocation: this.bookForm.value.shelfLocation,
        availableCopies: this.bookForm.value.availableCopies,
        totalCopies: this.bookForm.value.totalCopies,
        minStock: this.bookForm.value.minStock,
        categoryId: this.bookForm.value.categoryId,
        publisherId: this.bookForm.value.publisherId,
        authorIds,
        isBestSeller: this.bookForm.value.isBestSeller,
        isNewRelease: this.bookForm.value.isNewRelease
      };

      this.http.post(
        this.ADMIN_API_URL,
        payloadAdd,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.showSuccessWithHighZIndex('Book added successfully');
            this.loadInventory();
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Add error:', err);
          this.showErrorWithHighZIndex(err?.error?.message || 'Failed to add book');
        }
      });
    }
  }

  // ===== SWAL HELPERS =====

  private showErrorWithHighZIndex(message: string): void {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      customClass: { container: 'swal-high-zindex' }
    });
  }

  private showSuccessWithHighZIndex(message: string): void {
    Swal.fire({
      title: 'Success',
      text: message,
      icon: 'success',
      customClass: { container: 'swal-high-zindex' }
    });
  }

  // ===== IMPORT =====

  openImportModal(): void {
    this.showImportModal = true;
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'xls' || fileExtension === 'xlsx' || fileExtension === 'csv') {
        this.selectedFile = file;
      } else {
        this.showErrorWithHighZIndex('Please select a valid Excel file (.xls, .xlsx) or CSV file');
        event.target.value = '';
      }
    }
  }

  downloadTemplate(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get(`${this.ADMIN_API_URL}/import-template`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 8);
        a.download = `books-import-template-${timestamp}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showSuccessWithHighZIndex('Template downloaded successfully');
      },
      error: () => {
        this.showErrorWithHighZIndex('Failed to download template');
      }
    });
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.showErrorWithHighZIndex('Please select a file first');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.isUploading = true;
    this.uploadProgress = 0;

    this.http.post(`${this.ADMIN_API_URL}/import`, formData, {
      headers: { Authorization: `Bearer ${token}` },
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 1 && event.total) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === 4) {
          this.isUploading = false;
          this.uploadProgress = 100;
          const response = event.body;

          Swal.fire({
            title: 'Import Complete',
            html: `
              <div style="text-align: left;">
                <p>${response.message || 'Import completed successfully'}</p>
                ${response.imported ? `<p><strong>Imported:</strong> ${response.imported}</p>` : ''}
                ${response.updated ? `<p><strong>Updated:</strong> ${response.updated}</p>` : ''}
                ${response.failed ? `<p><strong>Failed:</strong> ${response.failed}</p>` : ''}
              </div>
            `,
            icon: 'success',
            customClass: { container: 'swal-high-zindex' }
          });

          this.closeImportModal();
          this.loadInventory();
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        console.error('Import error:', err);
        this.showErrorWithHighZIndex(err?.error?.message || 'Failed to import books');
      }
    });
  }

  // ===== EXPORT =====

  exportBooks(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get(`${this.ADMIN_API_URL}/export`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
        a.download = `books-export-${timestamp}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showSuccessWithHighZIndex('Books exported successfully');
      },
      error: () => this.showErrorWithHighZIndex('Failed to export books')
    });
  }

  // ===== ARCHIVE =====

  toggleArchive(book: Book): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = book.archived
      ? `${this.ADMIN_API_URL}/${book.id}/unarchive`
      : `${this.ADMIN_API_URL}/${book.id}/archive`;

    this.http.post(url, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.showSuccessWithHighZIndex(res.message || (book.archived ? 'Book unarchived' : 'Book archived'));
        book.archived = !book.archived;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Archive error:', err);
        this.showErrorWithHighZIndex(err?.error?.message || 'Failed to update book status');
      }
    });
  }

  // ===== FORM ERROR MESSAGES =====

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
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Book Title',
      totalCopies: 'Total Copies'
    };
    return labels[fieldName] || fieldName;
  }
}