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
	Flex,
	Box,
	Pill,
	Txt
} from 'rendition'
import skhema from 'skhema'
import styled from 'styled-components'
import ContextMenu from '../components/ContextMenu'
import GroupUpdate from '../components/GroupUpdate'
import {
	Tag
} from '../components/Tag'
import {
	actionCreators,
	analytics,
	selectors,
	sdk
} from '../core'
import helpers from '../services/helpers'
import BaseLens from './common/BaseLens'
import Icon from '../shame/Icon'

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP'
const EllipsisButton = styled(Button) `
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: white;
	}
`

const OrgCard = (props) => {
	const {
		card
	} = props

	const arr = _.get(card, [ 'data', 'profile', 'projectedArr' ])

	return (
		<Box p={2}>
			{Boolean(card.tags) && _.map(card.tags, (tag) => {
				return (
					<Tag
						key={tag}
						mr={2}
					>
						{tag}
					</Tag>
				)
			})}
			<Txt>{card.name}</Txt>

			{arr && (
				<Pill bg="#2297DE">
					Projected ARR: {arr.toFixed(2)}
				</Pill>
			)}

		</Box>
	)
}

const cardMapper = (card) => {
	const message = _.find(_.get(card, [ 'links', 'has attached element' ]), {
		type: 'message'
	})
	return {
		id: card.id,
		type: card.type,
		title: card.name || card.slug || `${card.type}: ${card.id.substr(0, 7)}`,
		card,
		description: _.get(message, [ 'data', 'payload', 'message' ])
	}
}

class CustomLaneHeader extends React.Component {
	constructor (props) {
		super(props)

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		this.toggleUpdateModal = () => {
			this.setState({
				showUpdateModal: !this.state.showUpdateModal
			})
		}

		this.state = {
			showMenu: false,
			showUpdateModal: false
		}
	}

	render () {
		const {
			props
		} = this

		return (
			<div>
				<strong>{props.title}</strong>
				<EllipsisButton px={2} plain onClick={this.toggleMenu}>
					<Icon name="ellipsis-v"/>
				</EllipsisButton>

				{this.state.showMenu && (
					<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
						<Button plain onClick={this.toggleUpdateModal}>
						Update all items in this list
						</Button>
					</ContextMenu.ContextMenu>
				)}

				{this.state.showUpdateModal && (
					<GroupUpdate.GroupUpdate cards={props.cards} schema={props.schema} onClose={this.toggleUpdateModal}/>
				)}
			</div>
		)
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
		_.set(card, slice.path.replace(/properties\./g, ''), targetValue)
		sdk.card.update(card.id, card)
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
			return []
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
					customCardLayout={type.slug === 'org'}
					customLaneHeader={type ? <CustomLaneHeader schema={type.data.schema}/> : null}
					data={data}
					draggable={true}
					handleDragEnd={this.handleDragEnd}
					onCardClick={this.onCardClick}
				>
					<OrgCard />
				</ReactTrello>

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
