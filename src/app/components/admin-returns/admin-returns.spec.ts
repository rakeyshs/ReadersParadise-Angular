import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminReturns } from './admin-returns';

describe('AdminReturns', () => {
  let component: AdminReturns;
  let fixture: ComponentFixture<AdminReturns>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReturns]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminReturns);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
