import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeDeskComponent } from './welcomedesk.component';

describe('WelcomeDeskComponent', () => {
  let component: WelcomeDeskComponent;
  let fixture: ComponentFixture<WelcomeDeskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WelcomeDeskComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
