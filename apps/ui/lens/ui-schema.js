/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import AutoCompleteWidget from '../../../lib/ui-components/AutoCompleteWidget'

// This object acts as a lookup for widgets by widget component name
const Widgets = {
	AutoCompleteWidget
}

const replaceWidgetsCustomizer = (value, key) => {
	if (key === 'ui:widget' && Widgets[value]) {
		return Widgets[value]
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

export const getUiSchema = (cardType) => {
	const cardSchema = _.get(cardType, [ 'data', 'schema' ], {})
	const cardUiSchema = _.get(cardType, [ 'data', 'uiSchema' ], {})
	const uiSchema = _.cloneDeepWith(cardUiSchema, replaceWidgetsCustomizer)

	if (!uiSchema['ui:order'] && _.get(cardSchema, [ 'properties', 'name' ])) {
		uiSchema['ui:order'] = [ 'name', 'tags', '*' ]
	}
	return uiSchema
}
