// src/services/storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  get token(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  set token(value: string | null) {
    if (typeof window !== 'undefined') {
      if (value === null) localStorage.removeItem('token');
      else localStorage.setItem('token', value);
    }
  }
}
