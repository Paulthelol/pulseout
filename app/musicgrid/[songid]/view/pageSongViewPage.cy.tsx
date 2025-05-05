import React from 'react'
import SongViewPage from './page'

describe('<SongViewPage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SongViewPage params={Promise.resolve({ songid: 'test-songid' })} />)
  })
})