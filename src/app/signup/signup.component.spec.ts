// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;
    let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let rmmapi: jasmine.SpyObj<RunboxWebmailAPI>;

    beforeEach(async () => {
        queryParamMap$ = new BehaviorSubject(convertToParamMap({ runbox7: '1' }));
        rmmapi = jasmine.createSpyObj<RunboxWebmailAPI>('RunboxWebmailAPI', [
            'getRunboxDomains',
            'getSignupHCaptchaSiteKey',
        ]);
        // Real backend returns {id, name}[]; service signature is currently
        // typed as string[]. Cast so the mock exercises the runtime shape
        // production actually delivers.
        rmmapi.getRunboxDomains.and.returnValue(of([
            { id: 1, name: 'runbox.com' },
            { id: 2, name: 'runbox.no' },
            { id: 3, name: 'rbx.email' },
        ]) as any);
        rmmapi.getSignupHCaptchaSiteKey.and.returnValue(of('test-site-key'));

        await TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [SignupComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParamMap: queryParamMap$.asObservable(),
                    },
                },
                {
                    provide: RunboxWebmailAPI,
                    useValue: rmmapi,
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SignupComponent);
        component = fixture.componentInstance;
        // Minimal hCaptcha stub so renderHCaptcha completes on first try when
        // a test exercises the script-loaded path. Tests that don't reach
        // renderHCaptcha (loadResult=false) ignore this.
        (window as any).hcaptcha = { render: () => 'test-widget-id' };
    });

    afterEach(() => {
        try {
            if (fixture) {
                fixture.destroy();
            }
        } finally {
            delete (window as any).hcaptcha;
        }
    });

    // Defensive: signup adds body classes in ngOnInit; if a previous test's
    // fixture.destroy failed to run (e.g. spec aborted), the classes could leak
    // into siblings. Strip them unconditionally after the describe block.
    afterAll(() => {
        document.body.classList.remove('signup-page');
        document.getElementById('main')?.classList.remove('signup-page-shell');
    });

    function stubCaptchaInitialization(loadResult = false): jasmine.Spy {
        return spyOn<any>(component, 'loadHCaptchaScript').and.resolveTo(loadResult);
    }

    async function initComponent(loadResult = false): Promise<void> {
        stubCaptchaInitialization(loadResult);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function getForm(): NgForm {
        return fixture.debugElement.query(By.css('form')).injector.get(NgForm);
    }

    function setInputValue(selector: string, value: string): HTMLInputElement {
        const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return input;
    }

    function setCheckboxValue(selector: string, checked: boolean): HTMLInputElement {
        const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
        input.checked = checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input;
    }

    async function fillRequiredFields(): Promise<void> {
        setInputValue('input[name="first_name"]', 'Joe');
        setInputValue('input[name="last_name"]', 'Bond');
        setInputValue('input[name="user"]', 'joebond');
        setInputValue('input[name="password"]', 'S3cret!Pass');
        setInputValue('input[name="email_alternative"]', 'joe@example.com');
        setCheckboxValue('input[name="tos_accepted"]', true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('loads signup metadata from explicit API sources', async () => {
        await initComponent(true);

        expect(component.signupAction).toBe('/signup/signup');
        expect(component.hCaptchaSiteKey).toBe('test-site-key');
        expect(component.runboxDomains).toEqual(['runbox.com', 'runbox.no', 'rbx.email']);
        expect(component.runboxDomain).toBe('runbox.com');
        expect(rmmapi.getRunboxDomains).toHaveBeenCalled();
        expect(rmmapi.getSignupHCaptchaSiteKey).toHaveBeenCalled();
    });

    it('applies query parameters during initialization', async () => {
        queryParamMap$.next(convertToParamMap({
            accountType: 'business',
            domainType: 'user',
        }));

        await initComponent();

        expect(component.accountType).toBe('business');
        expect(component.domainType).toBe('user');
    });

    it('keeps safe defaults if legacy metadata cannot be fetched', async () => {
        rmmapi.getRunboxDomains.and.returnValue(throwError(() => new Error('backend unavailable')));
        rmmapi.getSignupHCaptchaSiteKey.and.returnValue(throwError(() => new Error('backend unavailable')));
        stubCaptchaInitialization(false);
        fixture.detectChanges();

        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.signupAction).toBe('/signup/signup');
        expect(component.runboxDomains).toEqual(['runbox.com', 'runbox.no']);
        expect(component.hCaptchaSiteKey).toBe('');
        expect(component.hCaptchaError).toContain('CAPTCHA is temporarily unavailable');
    });

    it('shows field-level validation feedback after submit', async () => {
        await initComponent();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const focusSpy = spyOn<any>(component, 'focusFirstInvalidField');

        formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await fixture.whenStable();
        fixture.detectChanges();

        const fieldErrors = Array.from(fixture.nativeElement.querySelectorAll('.field-error'))
            .map((el: HTMLElement) => el.textContent?.trim());

        expect(component.submitError).toBe('Complete the required fields before continuing.');
        expect(focusSpy).toHaveBeenCalledWith(formElement);
        expect(fieldErrors).toContain('Enter your first name.');
        expect(fieldErrors).toContain('Enter your last name.');
        expect(fieldErrors).toContain('Choose a username for your mailbox.');
        expect(fieldErrors).toContain('Enter a password for your account.');
        expect(fieldErrors).toContain('Enter an email address for recovery and account notices.');
        expect(fieldErrors).toContain('You must accept the terms to create an account.');
    });

    it('shows a field-level validation error for an invalid custom domain', async () => {
        await initComponent();

        component.domainType = 'user';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const domainControl = fixture.debugElement.query(By.css('input[name="userdomain"]')).injector.get(NgModel);
        setInputValue('input[name="userdomain"]', 'invalid domain');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.showUserDomainError(domainControl, getForm())).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Enter a valid domain such as example.com.');
    });

    it('blocks submit if captcha script failed to load even when required fields are valid', async () => {
        await initComponent();   // loadResult = false: simulates script failure
        await fillRequiredFields();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const submitSpy = spyOn(formElement, 'submit');

        component.onSubmit(getForm(), formElement);
        fixture.detectChanges();

        // After the S3 fix, a failed script load clears hCaptchaSiteKey so the
        // submit guard reports CAPTCHA unavailable rather than blaming the user
        // for not completing a widget that does not exist.
        expect(component.hCaptchaSiteKey).toBe('');
        expect(component.showCaptchaValidationError).toBeFalse();
        expect(component.submitError).toBe('CAPTCHA is unavailable right now. Please try again shortly.');
        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('blocks submit if user skipped captcha after script loaded', async () => {
        await initComponent(true);   // script loaded, widget render attempted
        await fillRequiredFields();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const submitSpy = spyOn(formElement, 'submit');

        component.onSubmit(getForm(), formElement);
        fixture.detectChanges();

        expect(component.showCaptchaValidationError).toBeTrue();
        expect(component.submitError).toBe('Complete the CAPTCHA verification before submitting.');
        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('blocks submit with a loading message when captcha script is still loading', async () => {
        // Simulate a slow CDN: site key arrives but the script never settles.
        let resolveScriptLoad!: (v: boolean) => void;
        spyOn<any>(component, 'loadHCaptchaScript').and.returnValue(
            new Promise<boolean>((resolve) => { resolveScriptLoad = resolve; }),
        );

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.hCaptchaSiteKey).toBe('test-site-key');
        expect((component as any).hCaptchaReady).toBeFalse();

        await fillRequiredFields();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const submitSpy = spyOn(formElement, 'submit');

        component.onSubmit(getForm(), formElement);
        fixture.detectChanges();

        expect(component.submitError).toBe('CAPTCHA is still loading. Please wait a moment and try again.');
        expect(submitSpy).not.toHaveBeenCalled();

        // Release the paused async chain so the component instance can be GC'd.
        resolveScriptLoad(false);
    });

    it('submits the native form when validation and captcha both pass', async () => {
        await initComponent(true);
        await fillRequiredFields();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const captchaResponse = document.createElement('textarea');
        captchaResponse.name = 'h-captcha-response';
        captchaResponse.value = 'captcha-token';
        formElement.appendChild(captchaResponse);
        const submitSpy = spyOn(formElement, 'submit');

        component.onSubmit(getForm(), formElement);

        expect(component.submitInProgress).toBeTrue();
        expect(submitSpy).toHaveBeenCalled();
        expect(component.submitError).toBe('');
        expect(component.showCaptchaValidationError).toBeFalse();
    });
});
