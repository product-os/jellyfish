/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	Mermaid
} from 'rendition/dist/extra/Mermaid'
import * as helpers from '../services/helpers'

export default function FieldValue ({
	fieldValue, fieldKey, schema, parentKey, ...props
}) {
	let value = fieldValue

	if (_.get(schema, [ 'format' ]) === 'date-time') {
		value = helpers.formatTimestamp(fieldValue)
	}

	if (_.get(schema, [ 'format' ]) === 'mermaid') {
		return <Mermaid {...props} value={value}/>
	}

	if (parentKey === 'mirrors' && _.includes(fieldValue, 'frontapp.com')) {
		const id = fieldValue.split('/').pop()
		value = `https://app.frontapp.com/open/${id}`
	}

	return <Markdown {...props}>{value.toString()}</Markdown>
}
