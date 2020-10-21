/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	createBrowserHistory,
	createMemoryHistory
} from 'history'
import {
	isProduction
} from '@balena/jellyfish-environment'

// Because we use connected-react-router we need to explicitly create
// our history instance
const getHistory = () => {
	try {
		// Default to browser history - if available
		// Note: due to Ava's precompilation it's not always possible to determine
		// at this stage whether we can/should use browser history or not.
		return createBrowserHistory()
	} catch (error) {
		// If we're in production mode we need to be using browser history
		// so this is a problem.
		if (isProduction()) {
			console.log('Browser History is required in production')
			throw error
		}

		// We're in a test environment with no DOM support so we use a
		// memory history instance instead.
		return createMemoryHistory()
	}
}

export default getHistory()
