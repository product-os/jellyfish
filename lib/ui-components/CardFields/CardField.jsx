/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import * as helpers from '../services/helpers'
import FieldValue from './FieldValue'
import {
	Heading
} from 'rendition'

const MARGIN = 2

const CardField = ({
	field, payload, schema, parentKey, depth = 0
}) => {
	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}

	const fieldValue = payload[field]

	if (typeof fieldValue === 'undefined') {
		return null
	}

	// Use a smaller header for nested keys
	let Header = Heading.h4

	if (depth === 1) {
		Header = Heading.h5
	}
	if (depth > 1) {
		Header = Heading.h6
	}

	const title = _.get(schema, [ 'title' ]) || field

	const fieldId = helpers.slugify(field.toString())

	return (
		<React.Fragment>
			{!_.isArray(payload) && (
				<Header mt={MARGIN} data-test={`card-field__label--${fieldId}`}>
					{title}
				</Header>
			)}

			{_.isObject(fieldValue) && _.map(fieldValue, (item, key) => {
				return (
					<CardField
						field={key}
						depth={depth + 1}
						payload={fieldValue}
						parentKey={field}
						schema={_.get(schema, [ 'properties', key ], {})}
					/>
				)
			})}

			{!_.isObject(fieldValue) && (
				<FieldValue
					depth={depth + 1}
					fieldValue={fieldValue}
					fieldKey={field}
					parentKey={parentKey}
					schema={schema}
					data-test={`card-field__value--${fieldId}`}
				/>
			)}
		</React.Fragment>
	)
}

export default CardField
