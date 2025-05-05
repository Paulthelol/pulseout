import React from 'react'
import Layout from './layout'

describe('<Layout />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<Layout />)
  })
})