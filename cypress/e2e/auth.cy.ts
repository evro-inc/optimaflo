describe('Clerk Authentication Tests', () => {
  beforeEach(() => {
    // Clear any prior session information
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.loginGoogle()
    // Wait for Clerk handshake process to complete
    cy.visit('/');
    cy.wait(2000);
  });

  it('shows onboarding', function () {
    cy.get('[data-cy-id="login"]').click
  })

  /*   it('should log in using email code', () => {
      // Sign in with Clerk using an email code
      cy.clerkSignIn({
        strategy: 'email_code',
        identifier: 'optimaflo+clerk_test@gmail.com',
      });
  
      // Wait for a short duration to ensure the session is established
      cy.wait(1000);
  
      // Visit a protected page to verify the user is signed in
      cy.visit('/profile');
  
      // Assert that the user is signed in by checking for user-specific content
      cy.get('[data-cy=userNameDisplay]')
        .should('be.visible')
        .and('contain', 'Test User');
    });
  
    it('should log out', () => {
      // Sign in first
      cy.clerkSignIn({
        strategy: 'email_code',
        identifier: 'optimaflo+clerk_test@gmail.com',
      });
  
      // Wait for a short duration to ensure the session is established
      cy.wait(1000);
  
      // Visit a protected page
      cy.visit('/profile');
  
      // Sign out using Clerk's custom command
      cy.clerkSignOut();
  
      // Assert that the user is redirected to the sign-in page
      cy.url().should('include', '/sign-in');
    }); */
});
