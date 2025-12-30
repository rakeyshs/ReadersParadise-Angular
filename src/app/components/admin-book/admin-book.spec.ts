import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBook } from './admin-book';

describe('AdminBook', () => {
  let component: AdminBook;
  let fixture: ComponentFixture<AdminBook>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBook]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBook);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
