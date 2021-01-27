/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import path from 'path'
import _ from 'lodash'
import {
	v4 as uuid
} from 'uuid'
import {
	addNotification,
	helpers
} from '@balena/jellyfish-ui-components'
import {
	linkConstraints
} from '@balena/jellyfish-client-sdk'
import {
	analytics,
	sdk
} from '../../core'

export default class BaseLens extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			creatingCard: false
		}

		this.onAddCard = this.onAddCard.bind(this)
		this.appendChannel = this.appendChannel.bind(this)
		this.addLinkedCard = this.addLinkedCard.bind(this)
		this.openCreateChannel = this.openCreateChannel.bind(this)
	}

	onAddCard (event) {
		event.preventDefault()
		if (this.props.addLinkedCardType) {
			this.addLinkedCard()
		} else {
			this.openCreateChannel()
		}
	}

	addLinkedCard () {
		if (!this.props.addLinkedCardType) {
			console.warn('.addLinkedCard() called, but addLinkedCardType prop is not set')
			return
		}
		const {
			head
		} = this.props.channel.data
		if (!head) {
			console.warn('.addLinkedCard() called, but there is no head card')
			return
		}
		if (helpers.getTypeBase(head.type) === 'view') {
			console.warn('.addLinkedCard() is only valid for views')
			return
		}

		const cardData = this.getSeedData()

		cardData.slug = `${this.props.addLinkedCardType}-${uuid()}`
		cardData.type = this.props.addLinkedCardType
		if (!cardData.data) {
			cardData.data = {}
		}
		this.setState({
			creatingCard: true
		})
		sdk.card.create(cardData)
			.then(async (newCard) => {
				if (newCard) {
					this.appendChannel(newCard.slug || newCard.id)
					const linkConstraint = _.find(linkConstraints, {
						data: {
							from: this.props.addLinkedCardType,
							to: helpers.getTypeBase(head.type)
						}
					})
					await sdk.card.link(newCard, head, linkConstraint.name)
				}
			})
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: cardData.type
					}
				})
			})
			.catch((error) => {
				addNotification('danger', error.message)
			})
			.finally(() => {
				this.setState({
					creatingCard: false
				})
			})
	}

	appendChannel (target) {
		// Remove everything after the current channel, then append the target.
		const current = this.props.channel.data.target
		this.props.history.push(
			path.join(window.location.pathname.split(current)[0], current, target)
		)
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
