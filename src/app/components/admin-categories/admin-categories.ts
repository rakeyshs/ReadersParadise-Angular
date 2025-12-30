import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

interface Category {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
  createdAt: string;
  updatedAt: string | null;
  subCategories: Category[];
  level?: number;
  expanded?: boolean;
  isVisible?: boolean;
}

@Component({
  selector: 'app-admin-categories',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss',
})
export class AdminCategories implements OnInit {

  categories: Category[] = [];
  flatCategories: Category[] = [];
  filteredCategories: Category[] = [];
  searchTerm = '';
  loading = false;

  activeTab: 'all' | 'active' | 'inactive' = 'all';

  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  pages: number[] = [];
  pageSizes: number[] = [5, 10, 20, 50];

  categoryForm!: FormGroup;
  selectedCategory: Category | null = null;
  showModal = false;
  isEditMode = false;

  allParentCategories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchCategories();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true],
      parentCategoryId: [null]
    });
  }

  setTab(tab: 'all' | 'active' | 'inactive') {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.currentPage = 1;
      this.applyFilter();
    }
  }

  fetchCategories() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<Category[]>('https://primabi.co/api/v1/admin/categories/getall', { headers }).subscribe({
      next: res => {
        this.categories = res || [];
        this.flattenCategories();
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'Failed to load categories', 'error');
      }
    });
  }

  flattenCategories() {
    this.flatCategories = [];
    this.allParentCategories = [];
    
    const flatten = (cats: Category[], level = 0, parentExpanded = true) => {
      cats.forEach(cat => {
        const hasSubCategories = cat.subCategories && cat.subCategories.length > 0;
        const categoryWithMeta = { 
          ...cat, 
          level,
          expanded: cat.expanded !== undefined ? cat.expanded : false,
          isVisible: level === 0 || parentExpanded
        };
        
        this.flatCategories.push(categoryWithMeta);
        
        // Collect all categories as potential parents (excluding the one being edited)
        this.allParentCategories.push(cat);
        
        if (hasSubCategories) {
          const shouldShowChildren = categoryWithMeta.expanded;
          flatten(cat.subCategories, level + 1, shouldShowChildren);
        }
      });
    };

    flatten(this.categories);
  }

  toggleExpand(category: Category) {
    const foundCategory = this.findCategoryInTree(this.categories, category.id);
    if (foundCategory) {
      foundCategory.expanded = !foundCategory.expanded;
      this.flattenCategories();
      this.applyFilter();
    }
  }

  findCategoryInTree(categories: Category[], id: number): Category | null {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.subCategories && cat.subCategories.length > 0) {
        const found = this.findCategoryInTree(cat.subCategories, id);
        if (found) return found;
      }
    }
    return null;
  }

  hasSubCategories(category: Category): boolean {
    return category.subCategories && category.subCategories.length > 0;
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    
    let filtered = this.flatCategories.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(term) ||
                           (c.description && c.description.toLowerCase().includes(term));
      const matchesTab = this.activeTab === 'all' ? true :
                        this.activeTab === 'active' ? c.isActive :
                        !c.isActive;
      
      return matchesSearch && matchesTab && c.isVisible;
    });

    this.filteredCategories = filtered;
    this.totalPages = Math.ceil(this.filteredCategories.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get paginatedCategories(): Category[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredCategories.slice(start, end);
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.applyFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
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

  openAddModal() {
    this.isEditMode = false;
    this.selectedCategory = null;
    this.categoryForm.reset({
      name: '',
      description: '',
      isActive: true,
      parentCategoryId: null
    });
    this.showModal = true;
  }

  openEditModal(category: Category) {
    this.isEditMode = true;
    this.selectedCategory = category;
    
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      parentCategoryId: category.parentCategoryId
    });
    this.showModal = true;
  }

  getAvailableParents(): Category[] {
    if (!this.isEditMode || !this.selectedCategory) {
      return this.allParentCategories;
    }
    
    // Filter out current category and its descendants from parent list
    return this.allParentCategories.filter(c => {
      return c.id !== this.selectedCategory!.id && !this.isDescendant(this.selectedCategory!.id, c.id);
    });
  }

  isDescendant(parentId: number, childId: number): boolean {
    const parent = this.findCategoryInTree(this.categories, parentId);
    if (!parent) return false;
    
    const checkChildren = (cats: Category[]): boolean => {
      for (const cat of cats) {
        if (cat.id === childId) return true;
        if (cat.subCategories && cat.subCategories.length > 0) {
          if (checkChildren(cat.subCategories)) return true;
        }
      }
      return false;
    };
    
    return checkChildren(parent.subCategories || []);
  }

  closeModal() {
    this.showModal = false;
    setTimeout(() => {
      this.categoryForm.reset();
      this.flattenCategories(); // Reset parent list
    }, 50);
  }

  saveCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.value;
    const body = {
      name: value.name.trim(),
      description: value.description ? value.description.trim() : '',
      isActive: value.isActive,
      parentCategoryId: value.parentCategoryId || null
    };

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    if (this.isEditMode && this.selectedCategory) {
      this.http.post(
        `https://primabi.co/api/v1/admin/categories/update/${this.selectedCategory.id}`,
        body,
        { headers }
      ).subscribe({
        next: () => {
          Swal.fire('Success', 'Category updated successfully', 'success');
          this.closeModal();
          this.fetchCategories();
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Failed to update category';
          Swal.fire('Error', errorMsg, 'error');
        }
      });
    } else {
      this.http.post(
        'https://primabi.co/api/v1/admin/categories/create',
        body,
        { headers }
      ).subscribe({
        next: () => {
          Swal.fire('Success', 'Category created successfully', 'success');
          this.closeModal();
          this.fetchCategories();
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Failed to create category';
          Swal.fire('Error', errorMsg, 'error');
        }
      });
    }
  }

  deleteCategory(category: Category) {
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const warningText = hasSubCategories 
      ? `Delete category "${category.name}" and all its subcategories?`
      : `Delete category "${category.name}"?`;

    Swal.fire({
      title: 'Are you sure?',
      text: warningText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

        this.http.post(
          `https://primabi.co/api/v1/admin/categories/delete/${category.id}`,
          {},
          { headers }
        ).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Category has been deleted.', 'success');
            this.fetchCategories();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Failed to delete category';
            if (errorMsg.includes('associated books')) {
              Swal.fire({
                icon: 'error',
                title: 'Cannot Delete Category',
                text: 'This category has books associated with it. Please reassign or remove the books before deleting the category.',
                confirmButtonColor: '#2563eb'
              });
            } else {
              Swal.fire('Error', errorMsg, 'error');
            }
          }
        });
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getCategoryPrefix(cat: Category): string {
    return cat.level && cat.level > 0 ? '└─ ' : '';
  }

  getCategoryIndent(cat: Category): number {
    return (cat.level || 0) * 24;
  }

  isInvalid(field: string) {
    const control = this.categoryForm.get(field);
    return control?.invalid && control?.touched;
  }

  getErrorMessage(field: string): string {
    const control = this.categoryForm.get(field);
    if (!control) return '';

    if (control.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control.hasError('minlength')) {
      return `Minimum length is ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors?.['maxlength'].requiredLength} characters`;
    }
    return '';
  }
}