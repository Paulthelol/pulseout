import React from 'react'
import CommentSection from './comment-section'

describe('<CommentSection />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<CommentSection songId="123" currentUser={{ id: "testUser", name: "testUser" }} />)
  })
})