/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import CircleIcon from 'react-icons/lib/fa/circle'
import {
	Box, Txt, useTheme
} from 'rendition'
import {
	useIsInUTCHourRange
} from '../hooks'

export const AvailabilityStatusOnline = () => {
	const theme = useTheme()

	return (
		<Box>
			<CircleIcon size="8px" color={theme.colors.success.main} />{' '}Online
		</Box>
	)
}

export const AvailabilityStatusOffline = () => {
	return (
		<Txt fontSize="12px" align="center">
            Available hours: <br />
			<b>8 am – 12 pm (GMT)</b>
		</Txt>
	)
}

export const AvailabilityStatus = () => {
	const isInRange = useIsInUTCHourRange(8, 24)

	return isInRange ? (
		<AvailabilityStatusOnline />
	) : (
		<AvailabilityStatusOffline />
	)
}
