import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, fromEvent, merge, interval, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  tokenExpiration?: string;
  user?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'https://primabi.co/api/v1/Auth/login';
  private readonly INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
  
  private inactivityTimer: Subscription | null = null;
  private sessionCheckTimer: Subscription | null = null;
  private activitySubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // App load होताच session check करा
    this.initializeSession();
  }

  private initializeSession() {
    if (typeof window === 'undefined') return;

    // पहिले session expired आहे का ते check करा
    if (this.isLoggedIn()) {
      if (this.checkSessionExpiry()) {
        // Session expired होता तर redirect करा
        this.redirectToLogin();
        return;
      }

      // Session valid आहे तर inactivity detection सुरू करा
      this.setupInactivityDetection();
      this.startInactivityTimer();
      this.startPeriodicSessionCheck();

      // Cross-tab logout साठी storage event listen करा
      this.setupStorageListener();
    }
  }

  login(email: string, password: string, remember = true): Observable<LoginResponse> {
    const body = { email, password };
    return this.http.post<LoginResponse>(this.API, body).pipe(
      tap((res) => {
        if (res && res.token) {
          try {
            const hasStorage =
              typeof window !== 'undefined' &&
              typeof localStorage !== 'undefined' &&
              typeof sessionStorage !== 'undefined';

            if (hasStorage) {
              const storage: Storage = remember ? localStorage : sessionStorage;
              storage.setItem('token', res.token);
              if (res.tokenExpiration) {
                storage.setItem('tokenExpiration', res.tokenExpiration);
              }
              if (res.user) {
                storage.setItem('user', JSON.stringify(res.user));
              }
              // Login वेळी lastActivity set करा
              storage.setItem('lastActivity', Date.now().toString());
            }

            // Login झाल्यावर सर्व timers सुरू करा
            this.setupInactivityDetection();
            this.startInactivityTimer();
            this.startPeriodicSessionCheck();
            this.setupStorageListener();

            console.log('%c✅ Login successful - Session tracking started', 'color: green; font-weight: bold;');

          } catch (e) {
            console.error('⚠️ Error storing token:', e);
          }
        } else {
          console.warn('⚠️ Login response did not contain a token:', res);
        }
      })
    );
  }

  private setupInactivityDetection() {
    if (typeof window === 'undefined') return;
    
    // पहिले cleanup करा
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
    }

    // User activity events
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const activity$ = merge(
      ...events.map(event => fromEvent(document, event))
    ).pipe(
      debounceTime(1000) // 1 second throttle
    );

    this.activitySubscription = activity$.subscribe(() => {
      if (this.isLoggedIn()) {
        this.updateLastActivity();
        this.resetInactivityTimer();
      }
    });
  }

  private startInactivityTimer() {
    this.stopInactivityTimer();
    
    this.inactivityTimer = interval(this.CHECK_INTERVAL).subscribe(() => {
      if (this.isLoggedIn()) {
        const storage = this.getStorage();
        if (!storage) return;

        const lastActivity = storage.getItem('lastActivity');
        if (!lastActivity) return;

        const elapsed = Date.now() - parseInt(lastActivity, 10);
        const remaining = this.INACTIVITY_TIMEOUT - elapsed;

        // Debug info (optional - remove in production)
        console.log(`⏱️ Session time remaining: ${Math.floor(remaining / 1000 / 60)} minutes`);

        if (elapsed >= this.INACTIVITY_TIMEOUT) {
          console.log('%c⏰ Session expired due to 20 minutes inactivity', 'color: orange; font-weight: bold;');
          this.logout();
          this.redirectToLogin();
        }
      } else {
        this.stopInactivityTimer();
      }
    });
  }

  private startPeriodicSessionCheck() {
    this.stopPeriodicSessionCheck();
    
    // दर मिनिटाला session check करा
    this.sessionCheckTimer = interval(this.CHECK_INTERVAL).subscribe(() => {
      if (this.isLoggedIn()) {
        this.checkSessionExpiry();
      } else {
        this.stopPeriodicSessionCheck();
      }
    });
  }

  private stopPeriodicSessionCheck() {
    if (this.sessionCheckTimer) {
      this.sessionCheckTimer.unsubscribe();
      this.sessionCheckTimer = null;
    }
  }

  private resetInactivityTimer() {
    this.startInactivityTimer();
  }

  private stopInactivityTimer() {
    if (this.inactivityTimer) {
      this.inactivityTimer.unsubscribe();
      this.inactivityTimer = null;
    }
  }

  private updateLastActivity() {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem('lastActivity', Date.now().toString());
      }
    } catch (e) {
      console.error('⚠️ Error updating last activity:', e);
    }
  }

  private setupStorageListener() {
    if (typeof window === 'undefined') return;

    // दुसऱ्या tab मध्ये logout झाले तर या tab मध्ये पण logout करा
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' && !event.newValue) {
        // Token deleted in another tab
        console.log('%c🔄 Logged out from another tab', 'color: blue; font-weight: bold;');
        this.cleanup();
        this.redirectToLogin();
      }
    });
  }

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  }

  getToken(): string | null {
    try {
      const storage = this.getStorage();
      return storage ? storage.getItem('token') : null;
    } catch {
      return null;
    }
  }

  getUser(): any | null {
    try {
      const storage = this.getStorage();
      const json = storage ? storage.getItem('user') : null;
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    try {
      console.log('%c🚪 Logging out...', 'color: red; font-weight: bold;');
      this.cleanup();
      
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem('token');
        storage.removeItem('tokenExpiration');
        storage.removeItem('user');
        storage.removeItem('lastActivity');
      }
    } catch (e) {
      console.error('⚠️ Error during logout:', e);
    }
  }

  private cleanup() {
    this.stopInactivityTimer();
    this.stopPeriodicSessionCheck();
    
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = null;
    }
  }

  private redirectToLogin() {
    if (typeof window !== 'undefined') {
      // Angular Router वापरा (better than window.location)
      this.router.navigate(['/login'], {
        queryParams: { sessionExpired: 'true' }
      });
    }
  }

  checkSessionExpiry(): boolean {
    try {
      const storage = this.getStorage();
      if (!storage || !this.isLoggedIn()) return false;

      const lastActivity = storage.getItem('lastActivity');
      if (!lastActivity) {
        // lastActivity नसेल तर आता set करा
        storage.setItem('lastActivity', Date.now().toString());
        return false;
      }

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > this.INACTIVITY_TIMEOUT) {
        console.log('%c⏰ Session expired - 20 minutes of inactivity', 'color: orange; font-weight: bold;');
        this.logout();
        this.redirectToLogin();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Optional: Get remaining session time
  getRemainingTime(): number {
    try {
      const storage = this.getStorage();
      if (!storage || !this.isLoggedIn()) return 0;

      const lastActivity = storage.getItem('lastActivity');
      if (!lastActivity) return this.INACTIVITY_TIMEOUT;

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      return Math.max(0, this.INACTIVITY_TIMEOUT - elapsed);
    } catch {
      return 0;
    }
  }
}