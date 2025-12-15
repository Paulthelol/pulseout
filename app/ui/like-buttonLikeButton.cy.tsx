// written by: Andrew
  // tested by: Paul
  import React from 'react'
import LikeButton from './like-button'

describe('<LikeButton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<LikeButton songId="sample-song-id" initialLiked={false} initialLikeCount={0} />)
  })
})