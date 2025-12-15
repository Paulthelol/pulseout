// written by: Andrew
  // tested by: Paul
  import React from 'react'
import { LikeButton } from './comment-section'

describe('<LikeButton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<LikeButton commentId="test-comment" initialLikes={0} initialLiked={false} />)
  })
})