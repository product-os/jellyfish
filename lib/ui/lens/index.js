
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import _ from 'lodash'
import skhema from 'skhema'
import jsone from 'json-e'

// Load lenses
import CreateLens from './actions/CreateLens'
import EditLens from './actions/EditLens'
import LinksGraphLens from './actions/LinksGraphLens'
import Account from './Account'
import Inbox from './Inbox'
import Interleaved from './Interleaved'
import Kanban from './Kanban'
import List from './List'
import Org from './Org'
import SingleCard from './SingleCard'
import SupportThread from './support/SupportThread'
import SupportThreads from './support/SupportThreads'
import Table from './Table'
import Thread from './Thread'
import Timeline from './Timeline'
import View from './View'
import MyUserLens from './MyUser'

class LensService {
	constructor () {
		this.lenses = [
			Account,
			MyUserLens,
			Inbox,
			Interleaved.default,
			Kanban,
			List,
			Org.default,
			SingleCard.default,
			SupportThread,
			SupportThreads,
			Table,
			Thread,
			Timeline,
			View
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

export default new LensService()
