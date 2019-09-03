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
	colorHash
} from '../services/helpers'

export default (props) => {
	const value = props.value
	const rest = _.omit(props, 'value')

	if (!value) {
		return null
	}

	return (
		<Badge
			{...rest}
			xsmall
			bg={colorHash(value)}
		>
			{value}
		</Badge>
	)
}
