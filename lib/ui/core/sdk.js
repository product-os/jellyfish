/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getSdk
} from '../../sdk'
import * as environment from '../environment'

export const sdk = getSdk({
	apiPrefix: environment.api.prefix,
	apiUrl: environment.api.url
})
