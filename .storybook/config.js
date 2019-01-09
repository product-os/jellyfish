import { configure } from '@storybook/react'
import * as React from 'react'
import { injectGlobal } from 'styled-components'
import { Theme } from 'rendition'

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

const req = require.context('../lib/ui/stories', true, /\.js$/)

const load = () => {
  req.keys().forEach(req)
}

configure(load, module)
