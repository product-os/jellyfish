/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */
import {
	getSdk
} from '../../sdk'

const API_PREFIX = process.env.API_PREFIX || 'api/v2'
const API_URL = process.env.API_URL || window.location.origin

export const sdk = getSdk({
	apiPrefix: API_PREFIX,
	apiUrl: API_URL
})
