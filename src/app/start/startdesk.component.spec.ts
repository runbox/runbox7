import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StartDeskComponent } from './startdesk.component';

describe('StartDeskComponent', () => {
  let component: StartDeskComponent;
  let fixture: ComponentFixture<StartDeskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StartDeskComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StartDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
