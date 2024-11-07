/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable<Subject = any> {
        loginGoogle(): Chainable<void>;
    }
}