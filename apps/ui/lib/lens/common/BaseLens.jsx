/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	helpers
} from '@balena/jellyfish-ui-components'

export default class BaseLens extends React.Component {
	constructor (props) {
		super(props)

		this.openCreateChannel = this.openCreateChannel.bind(this)
	}

	openCreateChannel () {
		this.props.actions.addChannel({
			head: {
				types: this.props.type,
				seed: this.getSeedData(),
				onDone: {
					action: 'open'
				}
			},
			format: 'create',
			canonical: false
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
