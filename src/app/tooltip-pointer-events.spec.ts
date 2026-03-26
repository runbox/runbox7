import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';

@Component({
  template: `
    <button id="first" matTooltip="Synchronize index with your device">Synchronize index</button>
    <button id="second" matTooltip="Compose an email to runbox support">Compose a bug report</button>
  `
})
class TestTooltipHostComponent {}

describe('Tooltip overlay pointer events', () => {
  let fixture: ComponentFixture<TestTooltipHostComponent>;
  let overlayContainer: OverlayContainer;
  let overlayContainerElement: HTMLElement;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatTooltipModule],
      declarations: [TestTooltipHostComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    overlayContainer = TestBed.inject(OverlayContainer);
    overlayContainerElement = overlayContainer.getContainerElement();
    fixture = TestBed.createComponent(TestTooltipHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('keeps tooltip overlays non-interactive so hovered controls behind them stay reachable', fakeAsync(() => {
    const firstButton = fixture.nativeElement.querySelector('#first');

    firstButton.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    tick(1000);
    fixture.detectChanges();

    const tooltipPanel = overlayContainerElement.querySelector('.mat-tooltip-panel') as HTMLElement;
    const tooltip = overlayContainerElement.querySelector('.mat-tooltip') as HTMLElement;

    expect(tooltipPanel).withContext('expected tooltip overlay panel to be rendered').not.toBeNull();
    expect(tooltip).withContext('expected tooltip element to be rendered').not.toBeNull();
    expect(getComputedStyle(tooltipPanel).pointerEvents).toBe('none');
    expect(getComputedStyle(tooltip).pointerEvents).toBe('none');
  }));
});
