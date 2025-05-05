import React from 'react'
import SongCard from './song-card'

describe('<SongCard />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SongCard />)
  })
})