/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Txt
} from 'rendition'
import {
	useIsInUTCHourRange
} from '../hooks'

export const AvailabilityStatus = () => {
	const isInRange = useIsInUTCHourRange(8, 24)

	if (isInRange) {
		return null
	}

	return (
		<Txt fontSize="12px" align="center">
            Available hours: <br />
			<b>8 am – 12 pm (GMT)</b>
		</Txt>
	)
}
