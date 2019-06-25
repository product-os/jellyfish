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
import EditLens from './actions/EditLens'
import LinksGraphLens from './actions/LinksGraphLens'

import Kanban from './Kanban'
import Table from './Table'

import FullLenses from './full'
import ListLenses from './list'
import SnippetLenses from './snippet'

const lenses = {
	full: FullLenses,
	list: ListLenses,
	snippet: SnippetLenses,

	// TODO: Find a more meaningful way to represent these lenses
	misc: [
		Kanban,
		Table
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
	if (data.action === 'visualize-links') {
		return LinksGraphLens
	}
	if (data.action === 'create') {
		return CreateLens
	}
	if (data.action === 'edit') {
		return EditLens
	}
	return _.first(getLenses(format, data, user))
}

export const getLensBySlug = (slug) => {
	const fullList = _.flatten(_.values(lenses))
	return _.find(fullList, {
		slug
	}) || null
}
