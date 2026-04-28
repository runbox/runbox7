// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2026 Runbox Solutions AS (runbox.com).
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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

type AccountType = 'person' | 'business';
type DomainType = 'runbox' | 'user';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('captchaContainer') captchaContainer?: ElementRef<HTMLDivElement>;

    accountType: AccountType = 'person';
    domainType: DomainType = 'runbox';

    user = '';
    userDomain = '';
    runboxDomain = 'runbox.com';
    firstName = '';
    lastName = '';
    company = '';
    password = '';
    emailAlternative = '';
    phoneNumberCellular = '';
    referrer = '';
    sendNewsOffers = '';
    tosAccepted = false;
    passwordStrength = 0;
    accountNumber = '';
    runbox7 = '1';
    timezone = 'UTC';
    signupAction = '/signup';

    runboxDomains = ['runbox.com', 'runbox.no'];
    readonly referrers = [
        'Advertisement',
        'Friend or family',
        'News media',
        'Review website',
        'Search engine',
        'Social media',
        'Other',
    ];

    hCaptchaSiteKey = environment.SIGNUP_HCAPTCHA_SITE_KEY || '';
    hCaptchaError = '';
    submitError = '';
    submitInProgress = false;
    showCaptchaValidationError = false;

    private hCaptchaWidgetId: string | null = null;
    private hCaptchaReady = false;
    private nativeSubmitting = false;
    private pendingCaptchaRender = false;

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
    ) {}

    ngOnInit(): void {
        document.body.classList.add('signup-page');
        document.getElementById('main')?.classList.add('signup-page-shell');

        const host = window?.location?.hostname || '';
        if (host.endsWith('.no')) {
            this.runboxDomain = 'runbox.no';
        }
        const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (resolvedTz) {
            this.timezone = resolvedTz;
        }
        this.route.queryParamMap.subscribe((params) => {
            const accountType = params.get('accountType');
            if (accountType === 'business' || accountType === 'person') {
                this.accountType = accountType;
            }
            const domainType = params.get('domainType');
            if (domainType === 'user' || domainType === 'runbox') {
                this.domainType = domainType;
            }
            this.accountNumber = params.get('account_number') || params.get('accountNumber') || '';
            this.runbox7 = params.get('runbox7') || '1';
        });

        void this.initializeHCaptcha();
    }

    ngAfterViewInit(): void {
        if (this.pendingCaptchaRender) {
            this.renderHCaptcha();
        }
    }

    ngOnDestroy(): void {
        document.body.classList.remove('signup-page');
        document.getElementById('main')?.classList.remove('signup-page-shell');
    }

    onPasswordChange(): void {
        let score = 0;
        if (this.password.length >= 8) {
            score++;
        }
        if (/[a-z]/.test(this.password) && /[A-Z]/.test(this.password)) {
            score++;
        }
        if (/\d/.test(this.password)) {
            score++;
        }
        if (/[^A-Za-z0-9]/.test(this.password)) {
            score++;
        }
        this.passwordStrength = score;
    }

    onSubmit(form: NgForm, formElement: HTMLFormElement): void {
        this.submitError = '';
        this.showCaptchaValidationError = false;

        if (this.nativeSubmitting) {
            return;
        }

        if (!form.valid) {
            this.submitError = 'Complete the required fields before continuing.';
            this.focusFirstInvalidField(formElement);
            return;
        }

        if (!this.hCaptchaSiteKey) {
            this.submitError = 'CAPTCHA is unavailable right now. Use the legacy signup page or try again shortly.';
            return;
        }

        if (!this.hasCaptchaResponse(formElement)) {
            this.showCaptchaValidationError = true;
            this.submitError = 'Complete the CAPTCHA verification before submitting.';
            this.captchaContainer?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        this.submitInProgress = true;
        this.nativeSubmitting = true;
        formElement.submit();
    }

    showFieldError(control?: NgModel | null, form?: NgForm): boolean {
        if (!control) {
            return false;
        }

        return control.invalid && (control.touched || control.dirty || Boolean(form?.submitted));
    }

    private async initializeHCaptcha(): Promise<void> {
        await this.loadLegacySignupMetadata();

        if (!this.hCaptchaSiteKey) {
            this.hCaptchaError = 'CAPTCHA is temporarily unavailable. Please use the legacy signup page below.';
            return;
        }

        const captchaLoaded = await this.loadHCaptchaScript();
        if (!captchaLoaded) {
            return;
        }

        this.hCaptchaReady = true;
        this.renderHCaptcha();
    }

    private loadLegacySignupMetadata(): Promise<void> {
        return new Promise((resolve) => {
            this.http
                .get('/signup?legacy=1&runbox7=1', { responseType: 'text' })
                .subscribe({
                    next: (html) => {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const legacyWidget = doc.querySelector('.h-captcha');
                        const legacyForm = doc.querySelector<HTMLFormElement>('form[name="signup"], form[action*="signup"]');
                        const legacyDomains = Array.from(
                            doc.querySelectorAll<HTMLSelectElement>('select[name="runboxDomain"] option'),
                        )
                            .map((option) => option.value.trim())
                            .filter((domain, index, domains) => Boolean(domain) && domains.indexOf(domain) === index);

                        this.hCaptchaSiteKey = legacyWidget?.getAttribute('data-sitekey') || this.hCaptchaSiteKey;
                        this.signupAction = legacyForm?.getAttribute('action') || this.signupAction;
                        if (legacyDomains.length > 0) {
                            this.runboxDomains = legacyDomains;
                            if (!this.runboxDomains.includes(this.runboxDomain)) {
                                this.runboxDomain = this.runboxDomains[0];
                            }
                        }
                        resolve();
                    },
                    error: () => resolve(),
                });
        });
    }

    private loadHCaptchaScript(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const existingScript = document.querySelector<HTMLScriptElement>('script[data-runbox-hcaptcha="1"]');
            if (existingScript) {
                if ((window as WindowWithHCaptcha).hcaptcha) {
                    resolve(true);
                    return;
                }

                const pollForHCaptcha = window.setInterval(() => {
                    if ((window as WindowWithHCaptcha).hcaptcha) {
                        window.clearInterval(pollForHCaptcha);
                        resolve(true);
                    }
                }, 100);

                existingScript.addEventListener('load', () => {
                    window.clearInterval(pollForHCaptcha);
                    resolve(true);
                }, { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load hCaptcha.')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://hcaptcha.com/1/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.setAttribute('data-runbox-hcaptcha', '1');
            script.addEventListener('load', () => resolve(true), { once: true });
            script.addEventListener('error', () => reject(new Error('Failed to load hCaptcha.')), { once: true });
            document.body.appendChild(script);
        }).catch((): boolean => {
            this.hCaptchaError = 'CAPTCHA could not be loaded. Please use the legacy signup page below.';
            return false;
        });
    }

    private renderHCaptcha(): void {
        if (!this.hCaptchaReady || !this.hCaptchaSiteKey) {
            return;
        }

        const container = this.captchaContainer?.nativeElement;
        const hcaptcha = (window as WindowWithHCaptcha).hcaptcha;
        if (!container || !hcaptcha) {
            this.pendingCaptchaRender = true;
            window.setTimeout(() => this.renderHCaptcha(), 0);
            return;
        }

        this.pendingCaptchaRender = false;

        if (this.hCaptchaWidgetId !== null) {
            return;
        }

        this.hCaptchaWidgetId = hcaptcha.render(container, {
            sitekey: this.hCaptchaSiteKey,
            callback: () => {
                this.hCaptchaError = '';
                this.submitError = '';
            },
            'expired-callback': () => {
                this.hCaptchaError = 'CAPTCHA expired. Complete it again before submitting.';
            },
            'error-callback': () => {
                this.hCaptchaError = 'CAPTCHA failed to load correctly. Try again or use the legacy signup page.';
            },
        });
    }

    private hasCaptchaResponse(formElement: HTMLFormElement): boolean {
        const response = formElement.querySelector<HTMLInputElement>('textarea[name="h-captcha-response"], input[name="h-captcha-response"]');
        return Boolean(response?.value?.trim());
    }

    private focusFirstInvalidField(formElement: HTMLFormElement): void {
        const firstInvalidField = formElement.querySelector<HTMLElement>(
            'input.ng-invalid, select.ng-invalid, textarea.ng-invalid, input:invalid, select:invalid, textarea:invalid',
        );
        firstInvalidField?.focus();
        firstInvalidField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

interface HCaptchaApi {
    render(container: string | HTMLElement, params: Record<string, unknown>): string;
}

interface WindowWithHCaptcha extends Window {
    hcaptcha?: HCaptchaApi;
}
