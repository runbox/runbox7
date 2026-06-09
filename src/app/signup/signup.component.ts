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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

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
    showPassword = false;
    emailAlternative = '';
    phoneNumberCellular = '';
    referrer = '';
    sendNewsOffers = '';
    tosAccepted = false;
    passwordStrength = 0;
    accountNumber = '';
    timezone = 'UTC';
    signupAction = '/signup/signup';

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

    hCaptchaSiteKey = '';
    hCaptchaError = '';
    submitError = '';
    submitInProgress = false;
    showCaptchaValidationError = false;

    private hCaptchaWidgetId: string | null = null;
    private hCaptchaReady = false;
    private nativeSubmitting = false;
    private pendingCaptchaRender = false;
    private destroyed = false;
    private captchaRenderTimer: number | null = null;
    private readonly subs = new Subscription();
    private readonly customDomainPattern = /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

    constructor(
        private route: ActivatedRoute,
        private rmmapi: RunboxWebmailAPI,
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
            const rawAccountNumber = params.get('account_number') || params.get('accountNumber') || '';
            this.accountNumber = /^[0-9]{0,12}$/.test(rawAccountNumber) ? rawAccountNumber : '';
        });

        this.initializeHCaptcha();
    }

    ngAfterViewInit(): void {
        if (this.pendingCaptchaRender) {
            this.renderHCaptcha();
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.subs.unsubscribe();
        if (this.captchaRenderTimer !== null) {
            window.clearTimeout(this.captchaRenderTimer);
            this.captchaRenderTimer = null;
        }
        document.body.classList.remove('signup-page');
        document.getElementById('main')?.classList.remove('signup-page-shell');
    }

    onPasswordChange(): void {
        let score = 0;
        if (this.password.length >= 8) {
            score++;
        }
        if (/\p{Ll}/u.test(this.password) && /\p{Lu}/u.test(this.password)) {
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

    onUserDomainBlur(): void {
        this.userDomain = this.userDomain.trim().toLowerCase();
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

        if (this.domainType === 'user' && !this.isUserDomainValid()) {
            this.submitError = 'Enter a valid domain such as example.com.';
            this.focusFirstInvalidField(formElement);
            return;
        }

        if (this.passwordStrength < 3) {
            this.submitError = 'Choose a stronger password before continuing.';
            const passwordInput = formElement.querySelector<HTMLInputElement>('input[name="password"]');
            passwordInput?.focus();
            return;
        }

        if (!this.hCaptchaReady) {
            this.submitError = this.hCaptchaSiteKey
                ? 'CAPTCHA is still loading. Please wait a moment and try again.'
                : 'CAPTCHA is unavailable right now. Please try again shortly.';
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
        try {
            formElement.submit();
        } catch (err) {
            this.submitInProgress = false;
            this.nativeSubmitting = false;
            this.submitError = 'Signup could not be submitted. Please try again.';
        }
    }

    showFieldError(control?: NgModel | null, form?: NgForm): boolean {
        if (!control) {
            return false;
        }

        return control.invalid && (control.touched || control.dirty || Boolean(form?.submitted));
    }

    showUserDomainError(control?: NgModel | null, form?: NgForm): boolean {
        if (!control) {
            return false;
        }

        const shouldShow = control.touched || control.dirty || Boolean(form?.submitted);
        return shouldShow && (!this.userDomain.trim() || !this.isUserDomainValid());
    }

    showPasswordError(control?: NgModel | null, form?: NgForm): boolean {
        if (!control) {
            return false;
        }

        const shouldShow = control.touched || control.dirty || Boolean(form?.submitted);
        return shouldShow && (control.invalid || this.passwordStrength < 3);
    }

    passwordErrorMessage(control?: NgModel | null): string {
        if (control?.errors?.['required']) {
            return 'Enter a password for your account.';
        }

        return 'Use a stronger password with a strength of at least 3/4.';
    }

    userDomainErrorMessage(control?: NgModel | null): string {
        if (!this.userDomain.trim() || control?.errors?.['required']) {
            return 'Enter your domain name.';
        }

        return 'Enter a valid domain such as example.com.';
    }

    private isUserDomainValid(): boolean {
        return this.customDomainPattern.test(this.userDomain.trim());
    }

    private initializeHCaptcha(): void {
        this.loadRunboxDomains();
        this.loadHCaptchaMetadata();
    }

    private loadRunboxDomains(): void {
        this.subs.add(this.rmmapi.getRunboxDomains().subscribe({
            next: (domains) => {
                // Backend returns {results: [{id, name}, ...]}; tolerate either shape
                // since other consumers historically treat the result as string[].
                const names = (Array.isArray(domains) ? domains : [])
                    .map((d: any) => typeof d === 'string' ? d : d?.name)
                    .filter((name: string | undefined): name is string => Boolean(name));
                if (names.length > 0) {
                    this.runboxDomains = names;
                    if (!this.runboxDomains.includes(this.runboxDomain)) {
                        this.runboxDomain = this.runboxDomains[0];
                    }
                }
            },
            error: () => {
                // Keep safe defaults if the domain list cannot be loaded.
            },
        }));
    }

    private loadHCaptchaMetadata(): void {
        this.subs.add(this.rmmapi.getSignupHCaptchaSiteKey().subscribe({
            next: async (siteKey) => {
                this.hCaptchaSiteKey = siteKey;
                if (!this.hCaptchaSiteKey) {
                    this.hCaptchaError = 'CAPTCHA is temporarily unavailable. Please try again shortly.';
                    return;
                }

                const captchaLoaded = await this.loadHCaptchaScript();
                if (this.destroyed) {
                    return;
                }
                if (!captchaLoaded) {
                    // Site key was set above but the script never loaded; clear it so the
                    // submit guard correctly reports CAPTCHA unavailable instead of telling
                    // the user to complete a widget that does not exist.
                    this.hCaptchaSiteKey = '';
                    return;
                }

                this.hCaptchaReady = true;
                this.renderHCaptcha();
            },
            error: () => {
                this.hCaptchaSiteKey = '';
                this.hCaptchaError = 'CAPTCHA is temporarily unavailable. Please try again shortly.';
            },
        }));
    }

    private loadHCaptchaScript(): Promise<boolean> {
        // Ad blockers, privacy extensions, and strict CSP can silently drop the
        // script request without ever firing a `load` or `error` event. Without
        // a deadline the polling interval (existing-script path) and the promise
        // itself (new-script path) would hang indefinitely, leaking resources
        // and leaving the user with no widget and no error message.
        const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

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
                        window.clearTimeout(timeoutId);
                        resolve(true);
                    }
                }, 100);

                const timeoutId = window.setTimeout(() => {
                    window.clearInterval(pollForHCaptcha);
                    reject(new Error('hCaptcha load timed out.'));
                }, SCRIPT_LOAD_TIMEOUT_MS);

                existingScript.addEventListener('load', () => {
                    window.clearInterval(pollForHCaptcha);
                    window.clearTimeout(timeoutId);
                    resolve(true);
                }, { once: true });
                existingScript.addEventListener('error', () => {
                    window.clearInterval(pollForHCaptcha);
                    window.clearTimeout(timeoutId);
                    reject(new Error('Failed to load hCaptcha.'));
                }, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://hcaptcha.com/1/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.setAttribute('data-runbox-hcaptcha', '1');

            const timeoutId = window.setTimeout(() => {
                reject(new Error('hCaptcha load timed out.'));
            }, SCRIPT_LOAD_TIMEOUT_MS);

            script.addEventListener('load', () => {
                window.clearTimeout(timeoutId);
                resolve(true);
            }, { once: true });
            script.addEventListener('error', () => {
                window.clearTimeout(timeoutId);
                reject(new Error('Failed to load hCaptcha.'));
            }, { once: true });
            document.body.appendChild(script);
        }).catch((): boolean => {
            if (this.destroyed) { return false; }
            // Remove a failed/stale script element so the next attempt takes the
            // "create new script" branch instead of polling a settled element
            // whose load/error events will never re-fire.
            document.querySelector('script[data-runbox-hcaptcha="1"]')?.remove();
            this.hCaptchaError = 'CAPTCHA could not be loaded. Please try again shortly.';
            return false;
        });
    }

    private renderHCaptcha(): void {
        if (this.destroyed || !this.hCaptchaReady || !this.hCaptchaSiteKey) {
            return;
        }

        const container = this.captchaContainer?.nativeElement;
        const hcaptcha = (window as WindowWithHCaptcha).hcaptcha;
        if (!container || !hcaptcha) {
            this.pendingCaptchaRender = true;
            this.captchaRenderTimer = window.setTimeout(() => {
                this.captchaRenderTimer = null;
                this.renderHCaptcha();
            }, 0);
            return;
        }

        this.pendingCaptchaRender = false;
        this.captchaRenderTimer = null;

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
                this.hCaptchaError = 'CAPTCHA failed to load correctly. Please try again.';
            },
        });
    }

    private hasCaptchaResponse(formElement: HTMLFormElement): boolean {
        const response = formElement.querySelector<HTMLInputElement>('textarea[name="h-captcha-response"], input[name="h-captcha-response"]');
        return Boolean(response?.value?.trim());
    }

    private focusFirstInvalidField(formElement: HTMLFormElement): void {
        const firstInvalidField =
            formElement.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid') ||
            formElement.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid');
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
