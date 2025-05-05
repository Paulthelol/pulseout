import React from 'react'
import { Skeleton } from './skeleton'

describe('<Skeleton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<Skeleton />)
  })
})