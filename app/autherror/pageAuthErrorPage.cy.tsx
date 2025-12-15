  // written by: Andrew
  // tested by: Paul
import React from 'react'
import AuthErrorPage from './page'

describe('<AuthErrorPage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<AuthErrorPage />)
  })
})