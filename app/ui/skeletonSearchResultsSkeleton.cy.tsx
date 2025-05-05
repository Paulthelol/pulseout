import React from 'react'
import { SearchResultsSkeleton } from './skeleton'

describe('<SearchResultsSkeleton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SearchResultsSkeleton />)
  })
})