import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDashboardOverview } from './admin-dashboard-overview';

describe('AdminDashboardOverview', () => {
  let component: AdminDashboardOverview;
  let fixture: ComponentFixture<AdminDashboardOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
