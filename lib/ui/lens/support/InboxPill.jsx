/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Pill
} from 'rendition'
import {
	colorHash
} from '../../services/helpers'

export default (props) => {
	const card = props.card
	const rest = _.omit(props, 'card')

	if (!card.data.inbox) {
		return null
	}

	return (
		<Pill
			{...rest}
			bg={colorHash(card.data.inbox)}
		>
			{card.data.inbox}
		</Pill>
	)
}
