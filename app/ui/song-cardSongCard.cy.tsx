// written by: Andrew
  // tested by: Paul
  import React from 'react'
import SongCard from './song-card'

describe('<SongCard />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SongCard song={{
      id: '',
      name: '',
      artist: null,
      album: null,
      coverUrl: null,
      spotifyUrl: null,
      addedAt: null,
      likeCount: 0,
      commentCount: 0,
      userHasLiked: false
    }} />)
  })
})