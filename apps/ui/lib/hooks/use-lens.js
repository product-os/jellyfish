/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	getLens
} from '../lens'
import {
	selectors
} from '../core'

export const useLens = (data, format = 'full') => {
	const currentUser = useSelector(selectors.getCurrentUser)

	return React.useMemo(() => {
		if (data) {
			return getLens(
				format,
				data,
				currentUser
			)
		}

		return null
	}, [
		data,
		currentUser
	])
}
