/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Txt
} from 'rendition'
import {
	selectors
} from '../../core'

export const SubHeader = (card) => {
	const types = useSelector(selectors.getTypes)
	const typeBase = card.type && card.type.split('@')[0]

	const typeName = _.get(
		_.find(types, {
			slug: typeBase
		}),
		[ 'name' ],
		null
	)

	return (
		<Txt color="text.light" fontSize="0">
			{typeName}
		</Txt>
	)
}
