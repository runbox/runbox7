/// <reference types="cypress" />

type CssColorProperty = 'color' | 'backgroundColor';

const themeClasses = [
    'dark-theme',
    'terminal-theme',
    'christmas-theme',
    'high-contrast-theme'
];

const setPreference = (win: Window, key: string, value: string) => {
    const prefKey = `${key}`;
    const existingKeys = JSON.parse(win.localStorage.getItem('221:preference_keys') || '[]') as string[];
    const nextKeys = Array.from(new Set([...existingKeys, prefKey]));
    win.localStorage.setItem('221:preference_keys', JSON.stringify(nextKeys));
    win.localStorage.setItem(`221:${prefKey}`, JSON.stringify(value));
};

const visitInbox = (theme: 'dark' | 'terminal' | 'high-contrast' | 'christmas') => {
    cy.visit('/', {
        onBeforeLoad(win) {
            win.localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
            setPreference(win, 'Global:themePreference', theme);
            win.localStorage.setItem('221:preferences_version', JSON.stringify(1));
        }
    });

    cy.get('#mainMenuContainer', { timeout: 10000 }).should('exist');
    cy.get('.mailFolder', { timeout: 10000 }).should('exist');
    cy.get('app-virtual-scroll-table', { timeout: 20000 }).should('exist');
};

const waitForThemeClass = (theme: 'dark' | 'terminal' | 'high-contrast' | 'christmas') => {
    const className = `${theme}-theme`;
    cy.get('html', { timeout: 10000 }).should('have.class', className);
    cy.get('body', { timeout: 10000 }).should('have.class', className);
    cy.get('html').should('have.attr', 'data-theme', theme);
};

const resolveCssColor = (win: Window, varName: string, prop: CssColorProperty) => {
    const varValue = win.getComputedStyle(win.document.documentElement).getPropertyValue(varName).trim();
    const swatch = win.document.createElement('div');
    swatch.style[prop] = varValue;
    win.document.body.appendChild(swatch);
    const computed = win.getComputedStyle(swatch)[prop];
    swatch.remove();
    return { varValue, computed };
};

const resolveCssBackgroundImage = (win: Window, varName: string) => {
    const varValue = win.getComputedStyle(win.document.documentElement).getPropertyValue(varName).trim();
    const swatch = win.document.createElement('div');
    swatch.style.background = varValue;
    win.document.body.appendChild(swatch);
    const computed = win.getComputedStyle(swatch).backgroundImage;
    swatch.remove();
    return { varValue, computed };
};

const expectElementUsesVarColor = (selector: string, prop: CssColorProperty, varName: string) => {
    cy.get(selector).first().then($el => {
        cy.window().then(win => {
            const { varValue, computed } = resolveCssColor(win, varName, prop);
            expect(varValue).to.not.equal('');
            const actual = win.getComputedStyle($el[0])[prop];
            expect(actual).to.eq(computed);
        });
    });
};

const expectHeaderUsesGradientVar = () => {
    cy.get('#mainMenuContainer').then($el => {
        cy.window().then(win => {
            const { varValue, computed } = resolveCssBackgroundImage(win, '--rmm-header-gradient');
            expect(varValue).to.not.equal('');
            expect(computed).to.not.equal('none');
            const actual = win.getComputedStyle($el[0]).backgroundImage;
            expect(actual).to.eq(computed);
        });
    });
};

const expectHeaderUsesBackgroundVar = (varName: string) => {
    cy.get('#mainMenuContainer').then($el => {
        cy.window().then(win => {
            const { varValue, computed } = resolveCssColor(win, varName, 'backgroundColor');
            expect(varValue).to.not.equal('');
            const actual = win.getComputedStyle($el[0]).backgroundColor;
            expect(actual).to.eq(computed);
        });
    });
};

describe('Theme CSS variables', () => {
    it('applies CSS variables to key surfaces in dark theme', () => {
        visitInbox('dark');
        waitForThemeClass('dark');

        expectHeaderUsesGradientVar();
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('.mailFolder.selectedFolder a', 'color', '--rmm-selected-text');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });

    it('applies CSS variables to key surfaces in terminal theme', () => {
        visitInbox('terminal');
        waitForThemeClass('terminal');

        expectHeaderUsesBackgroundVar('--rmm-bg-primary');
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('.mailFolder.selectedFolder a', 'color', '--rmm-selected-text');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });

    it('applies CSS variables to key surfaces in high-contrast theme', () => {
        visitInbox('high-contrast');
        waitForThemeClass('high-contrast');

        // High-contrast uses solid black (#000000), not a gradient
        expectHeaderUsesBackgroundVar('--rmm-bg-primary');
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('.mailFolder.selectedFolder a', 'color', '--rmm-selected-text');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });

    it('applies CSS variables to key surfaces in christmas theme', () => {
        visitInbox('christmas');
        waitForThemeClass('christmas');

        expectHeaderUsesGradientVar();
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('.mailFolder.selectedFolder a', 'color', '--rmm-selected-text');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });
});
