// written by: Andrew
  // tested by: Paul
  import React from 'react'
import SideBar from './side-bar'

describe('<SideBar />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SideBar />)
  })
})