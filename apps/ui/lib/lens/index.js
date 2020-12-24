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
import UserLens from './misc/User'

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
		Chart,
		UserLens
	]
}

// Returns an array of lenses that can be used to render `data`.
// An optional array of lens slugs can be passed, to specify the order and
// restrict the lenses returned. An asterisk can be used to specify
// a wildcard, allowing any lens to be returned.
export const getLenses = (format, data, user) => {
	if (!data) {
		return []
	}

	if (!lenses[format]) {
		throw new Error(`Unknown lens format: ${format}`)
	}

	const scoredLenses = _.map(lenses[format], (lens) => {
		const filter = jsone(lens.data.filter, {
			user
		})
		return {
			lens,
			match: skhema.match(filter, data)
		}
	})
		.filter((result) => { return result.match.valid })
	const sorted = _.reverse(_.sortBy(scoredLenses, 'match.score'))
	return _.map(sorted, 'lens')
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
