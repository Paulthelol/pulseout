describe('Website Login', () => {
  it('passes', () => {
    cy.visit('http://localhost:3000/')
    cy.contains('Login').click(); 
    cy.contains('Log in with Spotify').click(); 

    
  })
})