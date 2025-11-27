import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="admin-root">
    <aside class="sidebar">
      <div class="brand">
  
        <div class="brand-info">
          <div class="brand-title">Reader's Paradise</div>
          <div class="brand-sub">Library Portal</div>
          <nav class="menu single">
            <a class="menu-item admin-only" routerLink="orders" routerLinkActive="active">
              <span class="icon">📦</span>
              <span class="label">Admin Users</span>

              
            </a>
          </nav>
        </div>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="page-title">Admin Dashboard</div>
        <div class="top-right">
          <div class="user">
            <div class="avatar">AK</div>
            <div class="user-info">
              <div class="name">Abhijit Karale</div>
          
            </div>
            <button class="btn-logout" (click)="logout()">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <path d="M16 17l5-5-5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  </div>
  `,
  styles: [
    `:host{display:block;font-family:Inter, Arial, sans-serif}
    .admin-root{display:flex;height:100vh;overflow:hidden}

    /* Sidebar */
    .sidebar{width:260px;background:var(--card-bg);border-right:1px solid rgba(11,63,102,0.06);display:flex;flex-direction:column;justify-content:space-between;padding:20px}
    .brand{display:flex;gap:12px;align-items:center}
    .brand-img{height:44px;border-radius:8px}
    .brand-info{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-left:6px;width:100%}
    .brand-title{font-weight:800;color:var(--primary);line-height:1;font-size:25px}
    .brand-sub{font-size:15px;color:var(--muted);margin-bottom:15px}

    .menu{margin-top:6px;width:100%}
    .menu.single{margin-top:6px}
    .menu-item{display:flex;gap:12px;align-items:center;padding:10px;border-radius:10px;color:#07163a;text-decoration:none;margin-bottom:10px;transition:all 160ms ease}
    .menu-item .icon{font-size:18px}
    .menu-item:hover{background:linear-gradient(90deg, rgba(6,182,212,0.06), rgba(11,115,198,0.04))}
    .menu-item.admin-only{background:linear-gradient(90deg,var(--primary),var(--primary-2));color:#fff;padding:12px 16px;border-radius:12px;margin-top:10px;box-shadow:0 8px 20px rgba(11,115,198,0.08)}
    .menu-item.active{background:linear-gradient(90deg,var(--primary),var(--primary-2));color:#fff}
    .menu-item.active .icon{opacity:0.98}

    .sidebar-footer{font-size:13px;color:var(--muted);padding:10px;background:linear-gradient(180deg, rgba(14,165,233,0.03), rgba(6,182,212,0.02));border-radius:8px;text-align:left}

    /* Main area */
    .main-area{flex:1;display:flex;flex-direction:column}
    .topbar{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid rgba(11,63,102,0.04);background:linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9))}
    .page-title{font-size:16px;font-weight:800;color:#07163a}

    .top-right{display:flex;align-items:center}
    .user{display:flex;align-items:center;gap:12px}
    .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(180deg,var(--primary-2),var(--primary));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
    .user-info{display:flex;flex-direction:column}
    .name{font-size:13px;font-weight:700}
    .role{font-size:12px;color:var(--muted)}
  .btn-logout{display:inline-flex;align-items:center;gap:8px;margin-left:12px;padding:8px 12px;border-radius:12px;border:1px solid rgba(25,118,185,0.12);background:transparent;color:var(--primary);font-weight:700;cursor:pointer;transition:all 160ms ease;box-shadow:0 2px 6px rgba(11,63,102,0.04)}
  .btn-logout svg{width:16px;height:16px;opacity:0.95}
  .btn-logout:hover{background:linear-gradient(90deg, rgba(25,118,185,0.06), rgba(6,182,212,0.04));transform:translateY(-1px);box-shadow:0 8px 20px rgba(11,115,198,0.06)}
  .btn-logout:active{transform:translateY(0);box-shadow:0 4px 12px rgba(11,63,102,0.05)}
  .btn-logout:focus{outline:none;box-shadow:0 0 0 4px rgba(6,182,212,0.12)}

    .content{padding:28px;overflow:auto;background:linear-gradient(180deg, rgba(14,165,233,0.02), rgba(6,182,212,0.01))}

    @media (max-width:900px){
      .sidebar{width:72px}
      .menu-item .label{display:none}
      .brand-info{display:none}
    }
    `
  ]
})
export class AdminLayoutComponent {
  constructor(private auth: AuthService) {}

  logout() {
    this.auth.logout();
    // navigate by changing location
    location.href = '/login';
  }
}
