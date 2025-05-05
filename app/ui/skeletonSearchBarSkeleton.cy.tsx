import React from 'react'
import { SearchBarSkeleton } from './skeleton'

describe('<SearchBarSkeleton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SearchBarSkeleton />)
  })
})