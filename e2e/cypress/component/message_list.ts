const pick = (functions) => {
    const randomIndex = Math.floor(Math.random() * functions.length);
    return functions[randomIndex]; // Returns a randomly selected function
};

export function rangeCheckMessages(from, to) {
    checkMessage(from)
    cy.get('body').type('{shift}', { release: false }); // Press Shift
    checkMessage(to)
    cy.get('body').type('{shift}'); // Release Shift
}

function table() {
    return cy.get('app-virtual-scroll-table');
}

export function firstMessage() {
    return nthMessage(0)
}

export function nthMessage(n) {
    return table().find('tbody').eq(n);
}

export function checkMessage(n) {
    const checkboxClick = () => nthMessage(n).find('mat-checkbox').click()
    const ctrlMessageClick = () => nthMessage(n).click({ ctrlKey: true })

    return pick([
        checkboxClick,
        ctrlMessageClick,
    ])()
}

export function checkedMessages() {
    return cy.get('tbody .mat-checkbox-checked')
}
