import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookHistory } from './book-history';

describe('BookHistory', () => {
  let component: BookHistory;
  let fixture: ComponentFixture<BookHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
