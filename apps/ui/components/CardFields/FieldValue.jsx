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
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'

export default function FieldValue ({
	fieldValue, fieldKey, schema, parentKey, ...props
}) {
	if (_.isNil(fieldValue)) {
		return null
	}
	let value = fieldValue

	if (_.get(schema, [ 'format' ]) === 'date-time') {
		value = helpers.formatTimestamp(fieldValue)
	}

	if (_.get(schema, [ 'format' ]) === 'mermaid') {
		return <Mermaid {...props} value={value}/>
	}

	return <Markdown {...props}>{value.toString()}</Markdown>
}
