import _ from 'lodash';
import skhema from 'skhema';
import jsone from 'json-e';

import ActionLenses from './actions';
import FullLenses from './full';
import ListLenses from './list';
import SnippetLenses from './snippet';
import MiscLenses from './misc';
import { LensContract } from '../types';

const allLenses = _.concat<any>(
	ActionLenses,
	FullLenses,
	ListLenses,
	SnippetLenses,
	MiscLenses,
);

const lenses = _.groupBy(allLenses, 'data.format');

// Returns an array of lenses that can be used to render `data`.
// An optional onePer argument (dot-notation string) can be supplied
// to ensure only the top-scoring lens per group is returned.
export const getLenses = (format, data, user, onePer?) => {
	if (!data) {
		return [];
	}

	if (!lenses[format]) {
		throw new Error(`Unknown lens format: ${format}`);
	}

	let sortedData = _.chain(lenses[format])
		.map((lens) => {
			const filter = jsone(lens.data.filter, {
				user,
			});
			return {
				lens,
				match: skhema.match(filter, data),
			};
		})
		.filter('match.valid')
		.sortBy('match.score')
		.reverse()
		.value();

	if (onePer) {
		sortedData = _.chain(sortedData)
			.groupBy(`lens.${onePer}`)
			.map(0)
			.sortBy('match.score')
			.reverse()
			.value();
	}

	return _.map(sortedData, 'lens');
};

export const getLens = (format, data, user?) => {
	return _.first(getLenses(format, data, user));
};

export const getLensBySlug = (slug: string | null): LensContract | null => {
	if (!slug) {
		return null;
	}
	const fullList = _.flatten(_.values(lenses));
	return (
		_.find(fullList, {
			slug,
		}) || null
	);
};

export const getLensForTarget = (target) => {
	return _.find(allLenses, (lens) => {
		return (
			lens.data.pathRegExp && new RegExp(lens.data.pathRegExp).test(target)
		);
	});
};

// Generate a query that will get all the contextual threads and their attached
// messages and whispers
export const getContextualThreadsQuery = (id): any => {
	return {
		$$links: {
			'is attached to': {
				$$links: {
					'is of': {
						type: 'object',
						required: ['id'],
						properties: {
							id: {
								type: 'string',
								const: id,
							},
						},
						additionalProperties: false,
					},
				},
				type: 'object',
				required: ['type', 'active'],
				properties: {
					active: {
						type: 'boolean',
						const: true,
					},
					type: {
						type: 'string',
						const: 'thread@1.0.0',
					},
				},
				additionalProperties: true,
			},
		},
		type: 'object',
		required: ['type'],
		properties: {
			type: {
				type: 'string',
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
		},
		additionalProperties: true,
	};
};
