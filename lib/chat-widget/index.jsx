/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import {
	getSdk
} from '../../lib/sdk'
import * as environment from './environment'
import {
	App
} from './components/App'

export const createSdk = (options) => {
	return getSdk({
		apiPrefix: environment.api.prefix,
		apiUrl: environment.api.url,
		...options
	})
}

export const mount = (element, options) => {
	ReactDOM.render(<App {...options} />, element)
}
