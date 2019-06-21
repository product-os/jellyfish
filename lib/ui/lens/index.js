
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const _ = require('lodash')
const skhema = require('skhema')
const jsone = require('json-e')

// Load lenses
const CreateLens = require('./actions/CreateLens').default
const EditLens = require('./actions/EditLens').default
const LinksGraphLens = require('./actions/LinksGraphLens').default
const Account = require('./Account')
const Inbox = require('./Inbox')
const Interleaved = require('./Interleaved')
const Kanban = require('./Kanban')
const List = require('./List')
const Org = require('./Org')
const SingleCard = require('./SingleCard')
const SupportThread = require('./support/SupportThread')
const SupportThreads = require('./support/SupportThreads')
const Table = require('./Table')
const Thread = require('./Thread')
const Timeline = require('./Timeline')
const View = require('./View')
const MyUserLens = require('./MyUser').default

class LensService {
	constructor () {
		this.lenses = [
			Account.default,
			MyUserLens,
			Inbox.default,
			Interleaved.default,
			Kanban.default,
			List.default,
			Org.default,
			SingleCard.default,
			SupportThread.default,
			SupportThreads.default,
			Table.default,
			Thread.default,
			Timeline.default,
			View.default
		]
	}

	// Returns an array of lenses that can be used to render `data`.
	// An optional array of lens slugs can be passed, to specify the order and
	// restrict the lenses returned. An asterisk can be used to specify
	// a wildcard, allowing any lens to be returned.
	getLenses (data, user) {
		if (!data) {
			return []
		}
		const scoredLenses = _.map(this.lenses, (lens) => {
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
	getLens (data, user) {
		if (data.action === 'visualize-links') {
			return LinksGraphLens
		}
		if (data.action === 'create') {
			return CreateLens
		}
		if (data.action === 'edit') {
			return EditLens
		}
		return _.first(this.getLenses(data, user))
	}
	getLensBySlug (slug) {
		return _.find(this.lenses, {
			slug
		}) || null
	}
}

exports.default = new LensService()
