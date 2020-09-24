/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as Widgets from '../components/Widgets'

export const JF_FORMATS = [ {
	name: 'markdown', format: '.*'
}, {
	name: 'mermaid', format: '.*'
}, {
	name: 'uri', format: '.*'
}, {
	name: 'email', format: '.*'
}, {
	name: 'currency', format: '.*'
}, {
	name: 'data-url', format: '.*'
} ]

export const UI_SCHEMA_MODE = {
	edit: 'edit',
	create: 'create',
	full: 'full',
	fields: 'fields'
}

const replaceWidgetsCustomizer = (value, key) => {
	if (key === 'ui:widget' && Widgets[value]) {
		return Widgets[value]
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

export const getUiSchema = (cardType, mode = UI_SCHEMA_MODE.full) => {
	const cardSchema = _.get(cardType, [ 'data', 'schema' ], {})
	const cardUiSchema = _.get(cardType, [ 'data', 'uiSchema', mode ], {})
	const uiSchema = _.cloneDeepWith(cardUiSchema, replaceWidgetsCustomizer)

	if (!uiSchema['ui:order'] && _.get(cardSchema, [ 'properties', 'name' ])) {
		uiSchema['ui:order'] = [ 'name', 'tags', '*' ]
	}
	return uiSchema
}

// These functions will be passed to the JsonSchemaRenderer component to provide
// additional, Jellyfish-specific, context for use in evalulated values (using json-e).
export const jsonSchemaFns = {
	getMirror: (value) => {
		if (_.includes(value, 'frontapp.com')) {
			const id = value.split('/').pop()
			return `https://app.frontapp.com/open/${id}`
		}
		return value
	}
}
