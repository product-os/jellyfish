/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { Rating } from 'rendition';
import { AutoCompleteWidget } from '@balena/jellyfish-ui-components';
import { LoopWidget } from '../components/Widgets/LoopWidget';

export const UI_SCHEMA_MODE = {
	edit: 'edit',
	create: 'create',
	full: 'full',
	snippet: 'snippet',
	fields: 'fields',
};

// This object acts as a lookup for widgets by widget component name
const Widgets = {
	AutoCompleteWidget,
	Loop: LoopWidget,

	// TODO: Just using `Rating: Rating` does not work for some reason.
	Rating: (props) => {
		return <Rating {...props} />;
	},
};

const replaceWidgetsCustomizer = (value, key) => {
	if (key === 'ui:widget' && Widgets[value]) {
		return Widgets[value];
	}
	// eslint-disable-next-line no-undefined
	return undefined;
};

export const getUiSchema = (cardType, mode = UI_SCHEMA_MODE.full) => {
	const cardSchema = _.get(cardType, ['data', 'schema'], {});
	const cardUiSchema = _.get(cardType, ['data', 'uiSchema', mode], {});
	const uiSchema = _.cloneDeepWith(cardUiSchema, replaceWidgetsCustomizer);

	if (!uiSchema['ui:order'] && _.get(cardSchema, ['properties', 'name'])) {
		uiSchema['ui:order'] = ['name', 'tags', '*'];
	}
	return uiSchema;
};

// These functions will be passed to the Renderer component to provide
// additional, Jellyfish-specific, context for use in evalulated values (using json-e).
export const jsonSchemaFns = {
	getMirror: (value) => {
		if (_.includes(value, 'frontapp.com')) {
			const id = value.split('/').pop();
			return `https://app.frontapp.com/open/${id}`;
		}
		return value;
	},
};
