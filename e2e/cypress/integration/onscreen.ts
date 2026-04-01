describe('Onscreen (Jitsi) page', () => {
    beforeEach(() => {
        // Mock the external Jitsi script that would otherwise fail to load in CI
        cy.intercept('https://video.runbox.com/external_api.js', {
            body: 'window.JitsiMeetExternalAPI = class {};',
            headers: {
                'Content-Type': 'text/javascript'
            }
        }).as('jitsiScript');
    });

    it('can load onscreen page', () => {
        cy.visit('/onscreen', {
            onBeforeLoad: (win) => {
                // Stub the Jitsi API before the component tries to use it
                Object.defineProperty(win, 'JitsiMeetExternalAPI', {
                    value: class {},
                    writable: true
                });
            }
        });
        cy.get('app-onscreen-component', { timeout: 10000 }).should('exist');
        cy.get('#meetingForm').should('be.visible');
    });
});
