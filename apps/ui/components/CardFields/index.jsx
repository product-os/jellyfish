/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import JsonSchemaRenderer from 'rendition/dist/extra/JsonSchemaRenderer'
import {
	getLocalSchema
} from '@balena/jellyfish-ui-components/lib/services/helpers'
import {
	getUiSchema, jsonSchemaFns, JF_FORMATS, UI_SCHEMA_MODE
} from '../../lens/schema-util'

export default function CardFields ({
	card, type, viewMode = UI_SCHEMA_MODE.fields
}) {
	if (!card || !type) {
		return null
	}
	const typeSchema = _.get(type, [ 'data', 'schema' ])
	const localSchema = getLocalSchema(card)

	// Local schemas are considered weak and are overridden by a type schema
	const schema = _.merge({}, {
		type: 'object',
		properties: {
			data: localSchema
		}
	}, typeSchema)

	return (
		<JsonSchemaRenderer
			value={card}
			schema={schema}
			uiSchema={getUiSchema(type, viewMode)}
			extraFormats={JF_FORMATS}
			extraContext={{
				root: card,
				fns: jsonSchemaFns
			}}
			validate={false}
		/>
	)
}
