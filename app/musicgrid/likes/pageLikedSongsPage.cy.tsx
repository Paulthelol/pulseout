// written by: Andrew
  // tested by: Paul
import React from 'react'
import LikedSongsPage from './page'

describe('<LikedSongsPage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<LikedSongsPage />)
  })
})