import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, fromEvent, merge, timer, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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
  private readonly INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
  private inactivityTimer: Subscription | null = null;

  constructor(private http: HttpClient) {
    this.setupInactivityDetection();
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
              // Store login time
              storage.setItem('lastActivity', Date.now().toString());
            }

            // Start inactivity timer after successful login
            this.startInactivityTimer();

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

    // Listen for user activity events
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
      debounceTime(1000) // Throttle events to once per second
    );

    activity$.subscribe(() => {
      if (this.isLoggedIn()) {
        this.updateLastActivity();
        this.resetInactivityTimer();
      }
    });
  }

  private startInactivityTimer() {
    this.stopInactivityTimer();
    
    this.inactivityTimer = timer(this.INACTIVITY_TIMEOUT).subscribe(() => {
      console.log('%c⏰ Session expired due to inactivity', 'color: orange; font-weight: bold;');
      this.logout();
      
      // Redirect to login page (adjust route as needed)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    });
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
      this.stopInactivityTimer();
      
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem('token');
        storage.removeItem('tokenExpiration');
        storage.removeItem('user');
        storage.removeItem('lastActivity');
      }
      console.log('%c🚪 Logged out successfully', 'color: red; font-weight: bold;');
    } catch (e) {
      console.error('⚠️ Error during logout:', e);
    }
  }

  // Optional: Check if session is expired (useful for app initialization)
  checkSessionExpiry(): boolean {
    try {
      const storage = this.getStorage();
      if (!storage || !this.isLoggedIn()) return false;

      const lastActivity = storage.getItem('lastActivity');
      if (!lastActivity) return false;

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > this.INACTIVITY_TIMEOUT) {
        console.log('%c⏰ Session expired', 'color: orange; font-weight: bold;');
        this.logout();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}