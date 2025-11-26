import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // read token from localStorage (key used by AuthService)
  const token = (() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  })();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    // optional debug (remove in production)
    // console.log('🔐 authInterceptor attached token', token);
    return next(cloned);
  } else {
    return next(req);
  }
};
