/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import * as helpers from '../../../../lib/ui-components/services/helpers'

export default class BaseLens extends React.Component {
	constructor (props) {
		super(props)

		this.openCreateChannel = this.openCreateChannel.bind(this)
	}

	openCreateChannel () {
		this.props.actions.addChannel({
			head: {
				action: 'create',
				types: this.props.type,
				seed: this.getSeedData(),
				onDone: {
					action: 'open'
				}
			},
			canonical: false
		})
	}

	openChannel (card) {
		this.props.actions.addChannel({
			cardType: card.type,
			target: card.id,
			parentChannel: this.props.channel.id
		})
	}

	getSeedData () {
		const {
			head
		} = this.props.channel.data
		if (!head || (head.type !== 'view' && head.type !== 'view@1.0.0')) {
			return {}
		}
		const schema = helpers.getViewSchema(head, this.props.user)
		if (!schema) {
			return {}
		}

		// Always inherit markers from the head card
		return Object.assign(helpers.getUpdateObjectFromSchema(schema), {
			markers: head.markers
		})
	}
}
