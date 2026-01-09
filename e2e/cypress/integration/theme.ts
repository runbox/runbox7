/// <reference types="cypress" />

type CssColorProperty = 'color' | 'backgroundColor';

const themeClasses = [
    'dark-theme',
    'terminal-theme',
    'christmas-theme',
    'high-contrast-theme'
];

const visitInbox = () => {
    cy.visit('/', {
        onBeforeLoad(win) {
            win.localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
        }
    });

    cy.get('#mainMenuContainer', { timeout: 10000 }).should('exist');
    cy.get('.mailFolder', { timeout: 10000 }).should('exist');
    cy.get('app-virtual-scroll-table', { timeout: 20000 }).should('exist');
};

const applyThemeClass = (theme: 'dark' | 'terminal') => {
    const className = `${theme}-theme`;
    cy.document().then(doc => {
        doc.documentElement.classList.remove(...themeClasses);
        doc.body.classList.remove(...themeClasses);
        doc.documentElement.classList.add(className);
        doc.body.classList.add(className);
    });

    cy.get('html').should('have.class', className);
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
        visitInbox();
        applyThemeClass('dark');

        expectHeaderUsesGradientVar();
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });

    it('applies CSS variables to key surfaces in terminal theme', () => {
        visitInbox();
        applyThemeClass('terminal');

        expectHeaderUsesBackgroundVar('--rmm-bg-primary');
        expectElementUsesVarColor('.mailFolder:not(.selectedFolder) a', 'color', '--rmm-text-primary');
        expectElementUsesVarColor('app-virtual-scroll-table thead th', 'backgroundColor', '--rmm-bg-primary');
    });
});
