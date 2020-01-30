/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import path from 'path'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	withRouter
} from 'react-router-dom'
import ReactTrello from 'react-trello'
import {
	bindActionCreators
} from 'redux'
import {
	Button,
	Flex
} from 'rendition'
import skhema from 'skhema'
import {
	actionCreators,
	analytics,
	selectors,
	sdk
} from '../../core'
import * as helpers from '@jellyfish/ui-components/services/helpers'
import BaseLens from '../common/BaseLens'

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP'

const cardMapper = (card) => {
	const message = _.find(_.get(card, [ 'links', 'has attached element' ]), (linkedCard) => {
		return [ 'message', 'message@1.0.0' ].includes(linkedCard.type)
	})

	return {
		id: card.id,
		type: card.type,
		title: card.name || card.slug || `${card.type}: ${card.id.substr(0, 7)}`,
		card,
		description: _.get(message, [ 'data', 'payload', 'message' ])
	}
}

class Kanban extends BaseLens {
	constructor (props) {
		super(props)

		this.handleDragEnd = this.handleDragEnd.bind(this)
		this.onCardClick = this.onCardClick.bind(this)
	}

	onCardClick (cardId) {
		const card = _.find(this.props.tail, {
			id: cardId
		})

		this.props.history.push(
			path.join(window.location.pathname, card.slug || card.id)
		)
	}

	handleDragEnd (cardId, _sourceLaneId, targetLaneId) {
		const card = _.find(this.props.tail, {
			id: cardId
		})
		if (!card) {
			console.warn(`Could not find card by id: ${cardId}`)
			return
		}
		const activeSlice = _.get(this.props, [ 'subscription', 'data', 'activeSlice' ])
		const slices = this.getSlices()
		const slice = _.find(slices, {
			patch: activeSlice
		}) || slices[0]
		if (!slice) {
			return
		}
		const targetValue = _.find(slice.values, (value) => {
			return targetLaneId === `${slice.path}__${value}`
		})
		if (!targetValue) {
			return
		}

		const patch = helpers.patchPath(card, slice.path.replace(/properties\./g, ''), targetValue)

		sdk.card.update(card.id, card.type, patch)
			.then(() => {
				analytics.track('element.update', {
					element: {
						type: card.type,
						id: card.id
					}
				})
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message)
			})
	}

	getSlices () {
		const view = this.props.channel.data.head
		if (!view) {
			return []
		}
		return helpers.getViewSlices(view, this.props.types) || []
	}

	getLanes () {
		if (!this.props.tail || !this.props.tail.length) {
			return []
		}
		const activeSlice = _.get(this.props, [ 'subscription', 'data', 'activeSlice' ])
		let cards = this.props.tail.slice()
		const lanes = []
		const slices = this.getSlices()
		const slice = _.find(slices, {
			path: activeSlice
		}) || slices[0]
		if (!slice) {
			return [ {
				id: UNSORTED_GROUP_ID,
				cards: cards.map(cardMapper)
			} ]
		}
		slice.values.forEach((value) => {
			const lane = {
				id: `${slice.path}__${value}`,
				cards: [],
				title: value
			}
			if (!cards.length) {
				lanes.push(lane)
				return
			}
			const schema = _.set({
				type: 'object'
			}, slice.path, {
				const: value
			})
			const [ slicedCards, remaining ] = _.partition(cards, (card) => {
				return skhema.isValid(schema, card)
			})
			lane.cards = _.map(slicedCards, cardMapper)
			cards = remaining
			lanes.push(lane)
		})

		// Handle leftover cards by adding them to a single column at the beginning
		// of the board
		if (cards.length) {
			lanes.unshift({
				id: UNSORTED_GROUP_ID,
				cards: cards.map(cardMapper)
			})
		}
		return lanes
	}

	render () {
		const data = {
			lanes: this.getLanes()
		}

		const {
			type
		} = this.props

		const typeName = type ? type.name || type.slug : ''

		const components = {}

		return (
			<Flex
				flexDirection="column"
				style={{
					height: '100%', width: '100%', position: 'relative'
				}}
			>
				<ReactTrello
					style={{
						padding: '0 12px',
						background: 'none'
					}}
					components={components}
					data={data}
					draggable={true}
					handleDragEnd={this.handleDragEnd}
					onCardClick={this.onCardClick}
				/>

				{Boolean(type) && (
					<React.Fragment>
						<Button
							success
							onClick={this.openCreateChannel}
							m={3}
							style={{
								position: 'absolute',
								bottom: 0,
								right: 0
							}}
						>
							Add {typeName}
						</Button>
					</React.Fragment>
				)}
			</Flex>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: 'lens-kanban',
	type: 'lens',
	version: '1.0.0',
	name: 'Kanban lens',
	data: {
		supportsSlices: true,
		icon: 'columns',
		renderer: withRouter(connect(mapStateToProps, mapDispatchToProps)(Kanban)),
		filter: {
			type: 'array'
		},
		queryOptions: {
			limit: 500,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}

export default lens
