import React from 'react'
import ProfilePage from './page'

describe('<ProfilePage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<ProfilePage />)
  })
})