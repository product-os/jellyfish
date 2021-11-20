import findPathDeep from 'deepdash/findPathDeep';
import React from 'react';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import memoize from 'memoize-one';
import { SchemaSieve } from 'rendition';
import { getLens } from '..';

const typesToExclude = ['rating', 'summary', 'message', 'whisper'];

const getFullTextSearchTypes = memoize((types) => {
	return types.reduce((fullTextSearchTypes, type) => {
		if (typesToExclude.includes(type.slug)) {
			return fullTextSearchTypes;
		}
		const flatSchema = SchemaSieve.flattenSchema(type.data.schema);
		const fullTextSearchFieldFound = findPathDeep(
			flatSchema.properties,
			(value, key) => {
				return Boolean(key === 'fullTextSearch' && value);
			},
		);

		if (fullTextSearchFieldFound) {
			fullTextSearchTypes.push(`${type.slug}@${type.version}`);
		}
		return fullTextSearchTypes;
	}, []);
});

const generateOmniSearchView = memoize((typeSlugs) => {
	return {
		id: uuid(),
		slug: 'search',
		name: 'Search Jellyfish',
		type: 'view@1.0.0',
		markers: ['org-balena'],
		data: {
			types: typeSlugs,
			allOf: [
				{
					name: 'Active cards',
					schema: {
						type: 'object',
						properties: {
							active: {
								const: true,
								type: 'boolean',
							},
						},
						required: ['active'],
						additionalProperties: true,
					},
				},
			],
		},
	};
});

const OmniSearchLens = (props) => {
	const fullTextSearchTypes = getFullTextSearchTypes(props.types);
	const omniSearchView = generateOmniSearchView(fullTextSearchTypes);

	const channel = _.merge({}, props.channel, {
		data: {
			head: omniSearchView,
		},
	});

	const lens = getLens('full', omniSearchView, props.user);

	return <lens.data.renderer {...props} channel={channel} />;
};

export default {
	slug: 'lens-omni-search',
	type: 'lens',
	version: '1.0.0',
	name: 'Omni-search lens',
	data: {
		pathRegExp: '^search$',
		format: 'search',
		renderer: OmniSearchLens,
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};
