/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import skhema from 'skhema'
import jsone from 'json-e'

// TODO: Improve the way "utility" lenses are handled
import CreateLens from './actions/CreateLens'
import CreateUserLens from './actions/CreateUserLens'
import CreateViewLens from './actions/CreateView'
import EditLens from './actions/EditLens'
import LinksGraphLens from './actions/LinksGraphLens'

import Kanban from './misc/Kanban'
import SupportAuditChart from './misc/SupportAuditChart'
import Table from './misc/Table'
import CRMTable from './misc/CRMTable'
import Chart from './misc/Chart'

import FullLenses from './full'
import ListLenses from './list'
import SnippetLenses from './snippet'
import InboxLens from './misc/Inbox'

const lenses = {
	full: FullLenses,
	list: ListLenses,
	snippet: SnippetLenses,

	edit: [
		EditLens
	],

	inbox: [
		InboxLens
	],

	create: [
		CreateLens,
		CreateUserLens
	],

	createView: [
		CreateViewLens
	],

	visualizeLinks: [
		LinksGraphLens
	],

	// TODO: Find a more meaningful way to represent these lenses
	misc: [
		Kanban,
		SupportAuditChart,
		Table,
		CRMTable,
		Chart
	]
}

// Returns an array of lenses that can be used to render `data`.
// An optional onePer argument (dot-notation string) can be supplied
// to ensure only the top-scoring lens per group is returned.
export const getLenses = (format, data, user, onePer) => {
	if (!data) {
		return []
	}

	if (!lenses[format]) {
		throw new Error(`Unknown lens format: ${format}`)
	}

	let sortedData = _.chain(lenses[format])
		.map((lens) => {
			const filter = jsone(lens.data.filter, {
				user
			})
			return {
				lens,
				match: skhema.match(filter, data)
			}
		})
		.filter('match.valid')
		.sortBy('match.score')
		.reverse()
		.value()

	if (onePer) {
		sortedData = _.chain(sortedData)
			.groupBy(`lens.${onePer}`)
			.map(0)
			.sortBy('match.score')
			.reverse()
			.value()
	}

	return _.map(sortedData, 'lens')
}

export const getLens = (format, data, user) => {
	return _.first(getLenses(format, data, user))
}

export const getLensBySlug = (slug) => {
	const fullList = _.flatten(_.values(lenses))
	return _.find(fullList, {
		slug
	}) || null
}

// Generate a query that will get all the contextual threads and their attached
// messages and whispers
export const getContextualThreadsQuery = (id) => {
	return {
		$$links: {
			'is attached to': {
				$$links: {
					'is of': {
						type: 'object',
						required: [ 'id' ],
						properties: {
							id: {
								type: 'string',
								const: id
							}
						},
						additionalProperties: false
					}
				},
				type: 'object',
				required: [ 'type', 'active' ],
				properties: {
					active: {
						type: 'boolean',
						const: true
					},
					type: {
						type: 'string',
						const: 'thread@1.0.0'
					}
				},
				additionalProperties: true
			}
		},
		type: 'object',
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				enum: [ 'message@1.0.0', 'whisper@1.0.0' ]
			}
		},
		additionalProperties: true
	}
}
