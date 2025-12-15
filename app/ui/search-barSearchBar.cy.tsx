// written by: Andrew
  // tested by: Paul
  import React from 'react'
import SearchBar from './search-bar'

describe('<SearchBar />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SearchBar placeholder="Enter text..." />)
  })
})