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

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;
    let httpMock: HttpTestingController;
    let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    beforeEach(async () => {
        queryParamMap$ = new BehaviorSubject(convertToParamMap({ runbox7: '1' }));

        await TestBed.configureTestingModule({
            imports: [FormsModule, HttpClientTestingModule],
            declarations: [SignupComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParamMap: queryParamMap$.asObservable(),
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SignupComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    function stubCaptchaInitialization(loadResult = false): jasmine.Spy {
        return spyOn<any>(component, 'loadHCaptchaScript').and.resolveTo(loadResult);
    }

    function flushLegacyMetadata(html?: string): void {
        const request = httpMock.expectOne('/signup?legacy=1&runbox7=1');
        expect(request.request.method).toBe('GET');
        request.flush(html || `
            <html>
                <body>
                    <form name="signup" action="/mail/signup">
                        <select name="runboxDomain">
                            <option value="runbox.com">runbox.com</option>
                            <option value="runbox.no">runbox.no</option>
                            <option value="rbx.email">rbx.email</option>
                        </select>
                        <div class="h-captcha" data-sitekey="test-site-key"></div>
                    </form>
                </body>
            </html>
        `);
    }

    async function initComponent(html?: string, loadResult = false): Promise<void> {
        stubCaptchaInitialization(loadResult);
        fixture.detectChanges();
        flushLegacyMetadata(html);
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

    it('loads signup metadata from the legacy signup page', async () => {
        await initComponent();

        expect(component.signupAction).toBe('/mail/signup');
        expect(component.hCaptchaSiteKey).toBe('test-site-key');
        expect(component.runboxDomains).toEqual(['runbox.com', 'runbox.no', 'rbx.email']);
        expect(component.runboxDomain).toBe('runbox.com');
    });

    it('applies query parameters during initialization', async () => {
        queryParamMap$.next(convertToParamMap({
            accountType: 'business',
            domainType: 'user',
            account_number: '12345',
            runbox7: '7',
        }));

        await initComponent();

        expect(component.accountType).toBe('business');
        expect(component.domainType).toBe('user');
        expect(component.accountNumber).toBe('12345');
        expect(component.runbox7).toBe('7');
    });

    it('keeps safe defaults if legacy metadata cannot be fetched', async () => {
        stubCaptchaInitialization(false);
        fixture.detectChanges();

        const request = httpMock.expectOne('/signup?legacy=1&runbox7=1');
        request.flush('backend unavailable', { status: 500, statusText: 'Server Error' });

        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.signupAction).toBe('/signup');
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

    it('blocks submit if captcha is missing even when required fields are valid', async () => {
        await initComponent();
        await fillRequiredFields();

        const formElement = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const submitSpy = spyOn(formElement, 'submit');

        component.onSubmit(getForm(), formElement);
        fixture.detectChanges();

        expect(component.showCaptchaValidationError).toBeTrue();
        expect(component.submitError).toBe('Complete the CAPTCHA verification before submitting.');
        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('submits the native form when validation and captcha both pass', async () => {
        await initComponent();
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
