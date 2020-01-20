/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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

export {
	App
}
