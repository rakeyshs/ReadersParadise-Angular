import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import Swal from 'sweetalert2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ChangeDetectorRef } from '@angular/core';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MatButtonModule,MatIconModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, public router: Router, private cd: ChangeDetectorRef) {
this.form = this.fb.group({
  email: [ '',  [
      Validators.required, 
      Validators.email,
      Validators.pattern(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/ // standard email pattern
      )
    ]
  ],
  password: [ '',  [
      Validators.required,
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/ 
        /* 
          Password pattern explanation:
          - Minimum 8 characters
          - At least 1 uppercase letter
          - At least 1 lowercase letter
          - At least 1 number
          - At least 1 special character (@$!%*?&)
        */
      )
    ]
  ],
  remember: [true]
});
  }

  ngOnInit(): void {
    // If already logged in, redirect
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }
    try {
      document.body.classList.add('no-scroll-login');
      document.documentElement.classList.add('no-scroll-login');
    } catch (e) {}
  }

  ngOnDestroy(): void {
    try {
      document.body.classList.remove('no-scroll-login');
      document.documentElement.classList.remove('no-scroll-login');
    } catch (e) {}
  }

  submit() {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.value.email as string;
    const password = this.form.value.password as string;
    const remember = !!this.form.value.remember;

    this.loading = true;

    this.auth.login(email, password, remember).subscribe({
      next: (res) => {
        this.loading = false;
        this.cd.detectChanges();
        if (res && res.success && res.token) {
          // ✅ Login success
          Swal.fire({
            icon: 'success',
            title: 'Welcome!',
            text: res.message ?? 'Login successful',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            this.router.navigate(['/admin']);
          });
        } else {
          // ❌ Invalid credentials or failed login
          Swal.fire({
            icon: 'error',
            title: 'Invalid Credentials',
            text: res?.message ?? 'Invalid email or password',
            confirmButtonText: 'Try Again'
          });
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message ?? 'Login request failed';
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: msg,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
