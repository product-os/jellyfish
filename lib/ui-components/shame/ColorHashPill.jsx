/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Badge
} from 'rendition'
import {
	stringToNumber
} from '../services/helpers'

export default (props) => {
	const value = props.value
	const rest = _.omit(props, 'value')

	if (!value) {
		return null
	}

	const SHADE_MAP = {
		open: 1,
		closed: 5,
		balenaLabs: 4,
		balenaCloud: 9,
		openBalena: 16,
		balenaEtcher: 6,
		balenaOS: 20,
		balenaEngine: 2,
		balenaFin: 15
	}

	return (
		<Badge
			{...rest}
			xsmall
			shade={_.get(SHADE_MAP, [ value ], stringToNumber(value, 22))}
		>
			{value}
		</Badge>
	)
}
