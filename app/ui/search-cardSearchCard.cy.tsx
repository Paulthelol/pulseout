import React from 'react'
import SearchCard from './search-card'

describe('<SearchCard />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SearchCard />)
  })
})