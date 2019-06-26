/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	getLocalSchema
} from '../../services/helpers'
import CardField from '../CardField'

export default function CardFields (props) {
	const {
		card,
		fieldOrder,
		type,
		omit
	} = props
	const payload = card.data
	const typeSchema = _.get(type, [ 'data', 'schema' ])
	const localSchema = getLocalSchema(card)

	// Local schemas are considered weak and are overridden by a type schema
	const schema = _.merge({}, {
		type: 'object',
		properties: {
			data: localSchema
		}
	}, typeSchema)

	const unorderedKeys = _.filter(_.keys(payload), (key) => {
		return !_.includes(fieldOrder, key)
	})

	const keys = Reflect.apply(_.without, null, [
		(fieldOrder || []).concat(unorderedKeys),
		...(omit || [])
	])

	return (
		<React.Fragment>
			{_.map(keys, (key) => {
				return payload[key]
					? <CardField
						key={key}
						field={key}
						payload={payload}
						schema={_.get(schema, [ 'properties', 'data', 'properties', key ])}
					/>
					: null
			})}
		</React.Fragment>
	)
}
