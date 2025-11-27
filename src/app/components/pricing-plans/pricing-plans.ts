// ✅ UPDATED PRICING PLANS COMPONENT WITH FULL VALIDATION + MODAL UI

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pricing-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pricing-plans.html',
  styleUrls: ['./pricing-plans.scss']
})
export class PricingPlans implements OnInit {

  plans: any[] = [];
  planForm!: FormGroup;
  isEdit = false;
  selectedId: number | null = null;
  loading = false;
  showModal = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadPlans();

    // ⭐ FULL VALIDATION ADDED HERE
    this.planForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[A-Za-z0-9 ]+$/)
      ]],
      type: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z ]+$/)
      ]],
      price: [null, [
        Validators.required,
        Validators.min(1)
      ]],
      durationMonths: [null, [
        Validators.required,
        Validators.min(1),
        Validators.max(36)
      ]],
      refundableDeposit: [null, [
        Validators.required,
        Validators.min(0)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10)
      ]],
      features: ['', [
        Validators.required,
        Validators.minLength(5)
      ]],
      benefits: ['', [
        Validators.required,
        Validators.minLength(5)
      ]],
      isActive: [true]
    });
  }

  // ================= LOAD PLANS =================
loadPlans() {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No authentication token found', 'error');
      return;
    }

    this.loading = true;

    this.http.get('https://primabi.co/api/v1/admin/subscriptions/plans?includeInactive=true', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && Array.isArray(res.plans)) {
this.plans = res.plans.map((p: any) => ({
  id: p.id,
  name: p.name,
  type: p.type,
  price: p.price,
  durationMonths: p.durationMonths,
  refundableDeposit: p.refundableDeposit,
  features: Array.isArray(p.features) ? p.features : [],
  benefits: Array.isArray(p.benefits) ? p.benefits : [],
  description: p.description,
  
  // FIX → Convert string to boolean
  isActive: p.isActive === true || p.isActive === "active",

  subscribers: p.totalSubscribers || 0,
  revenue: p.price * (p.totalSubscribers || 0)
}));


          localStorage.setItem('plans', JSON.stringify(this.plans));
        } else {
          Swal.fire('Error', 'Invalid API response', 'error');
        }

        this.cd.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading plans:', err);
        Swal.fire('Error', 'Failed to load plans', 'error');
      }
    });
  }

  // ================= OPEN ADD MODAL =================
  addPlan() {
    this.isEdit = false;
    this.selectedId = null;
    this.planForm.reset({ isActive: true });
    this.showModal = true;
  }

  // ================= OPEN EDIT MODAL =================
  editPlan(plan: any, event: any) {
    event.stopPropagation();
    this.isEdit = true;
    this.selectedId = plan.id;

    this.planForm.patchValue({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      durationMonths: plan.durationMonths,
      refundableDeposit: plan.refundableDeposit,
      features: plan.features.join("\n"),
      benefits: plan.benefits.join("\n"),
      description: plan.description,
      isActive: plan.isActive
    });

    this.showModal = true;
  }

  // ================= CLOSE MODAL =================
  closeModal() {
    this.showModal = false;
    setTimeout(() => {
      this.planForm.reset({ isActive: true });
    }, 50);
  }

  // ================= SAVE (ADD/UPDATE) =================
  savePlan() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No authentication token found', 'error');
      return;
    }

    const raw = this.planForm.value;

    const payload = {
      name: raw.name,
      type: raw.type,
      price: raw.price,
      durationMonths: raw.durationMonths,
      refundableDeposit: raw.refundableDeposit,
      description: raw.description,
      features: raw.features.split("\n"),
      benefits: raw.benefits.split("\n"),
      displayOrder: 1000,
      isActive: raw.isActive
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // ⭐ UPDATE
    if (this.isEdit && this.selectedId) {
      this.http.post(
        `https://primabi.co/api/v1/admin/subscriptions/plans/${this.selectedId}/update`,
        payload,
        { headers }
      ).subscribe({
        next: () => {
          Swal.fire('Success', 'Plan updated successfully', 'success');
          this.loadPlans();
          this.closeModal();
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Failed to update plan', 'error');
        }
      });
      return;
    }

    // ⭐ ADD NEW
    this.http.post(
      'https://primabi.co/api/v1/admin/subscriptions/plans',
      payload,
      { headers }
    ).subscribe({
      next: () => {
        Swal.fire('Success', 'Plan added successfully', 'success');
        this.loadPlans();
        this.closeModal();
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to add plan', 'error');
      }
    });
  }

  isInvalid(field: string) {
    return this.planForm.get(field)?.invalid && this.planForm.get(field)?.touched;
  }

  // ================= TOGGLE STATUS (ACTIVATE/DEACTIVATE) =================
// ================= TOGGLE STATUS (ACTIVATE/DEACTIVATE) =================
  toggleStatus(plan: any, event: any) {
    event.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No token found', 'error');
      return;
    }

    const isActive = plan.isActive === true;

    const url = isActive
      ? `https://primabi.co/api/v1/admin/subscriptions/plans/${plan.id}/deactivate`
      : `https://primabi.co/api/v1/admin/subscriptions/plans/${plan.id}/activate`;

    this.http.post(url, {}, {
      headers: {
        accept: 'text/plain',
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        const newStatus =
          res.plan?.isActive === true || res.plan?.isActive === "active"
            ? true
            : false;

        // Update local object
        plan.isActive = newStatus;

        // Force Angular to detect change by replacing the object in array
        this.plans = this.plans.map(p =>
          p.id === plan.id ? { ...p, isActive: newStatus } : p
        );

        this.cd.detectChanges();
        this.loadPlans(); // Reload plans to sync state
        Swal.fire('Success', res.message || 'Status updated successfully', 'success');
      },
      error: (err) => {
        console.error('Toggle status error:', err);
        const errorMessage = err.error?.message || 'Failed to update plan status';
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  // ================= DELETE PLAN =================
deletePlan(plan: any, event: any) {
  event.stopPropagation();

  Swal.fire({
    title: 'Are you sure?',
    text: `Delete "${plan.name}" plan? This action cannot be undone!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it!'
  }).then((result) => {
    if (result.isConfirmed) {
      const token = localStorage.getItem('token');
      if (!token) {
        Swal.fire('Error', 'No token found', 'error');
        return;
      }

      // CORRECT API
      const url = `https://primabi.co/api/v1/admin/subscriptions/plans/${plan.id}/delete`;

      this.http.post(url, {}, {
        headers: {
          accept: 'text/plain',
          Authorization: `Bearer ${token}`
        }
      }).subscribe({
        next: (res: any) => {
          Swal.fire('Deleted!', res.message || 'Plan deleted successfully', 'success');

          // REMOVE FROM UI WITHOUT RELOADING
          this.plans = this.plans.filter(p => p.id !== plan.id);

          this.cd.detectChanges();
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Failed to delete plan', 'error');
          console.error(err);
        }
      });
    }
  });
}


}