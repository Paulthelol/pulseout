describe('Website Login', () => {
  it('passes', () => {
    cy.visit('https://pulseout-zeta.vercel.app')
    cy.contains('Login').click(); 
    cy.contains('Log in with Spotify').click(); 

    
  })
})