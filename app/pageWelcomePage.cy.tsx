// written by: Andrew
  // tested by: Paul
  import React from 'react'
import WelcomePage from './page'

describe('<WelcomePage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<WelcomePage />)
  })
})