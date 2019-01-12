import { configure, addDecorator } from '@storybook/react'
import * as React from 'react'
import { injectGlobal } from 'styled-components'
import { Theme, Provider } from 'rendition'

injectGlobal([], {
  '*': {
    boxSizing: 'border-box'
  },
  body: {
    lineHeight: 1.5,
    margin: 0,
    fontFamily: Theme.font
  }
})

addDecorator((storyFn) => (
	<Provider>
		{storyFn()}
	</Provider>
))

const req = require.context('../lib/ui/stories', true, /\.js$/)

const load = () => {
  req.keys().forEach(req)
}

configure(load, module)
