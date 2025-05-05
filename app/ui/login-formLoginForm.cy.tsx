import React from 'react'
import LoginForm from './login-form'

describe('<LoginForm />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<LoginForm />)
  })
})