// written by: Andrew
  // tested by: Paul
  import React from 'react'
import TrendingPage from './page'

describe('<TrendingPage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<TrendingPage />)
  })
})