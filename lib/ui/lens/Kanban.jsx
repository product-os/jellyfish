/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const reactTrello = require('react-trello')
const redux = require('redux')
const rendition = require('rendition')
const styledComponents = require('styled-components')
const ContextMenu = require('../components/ContextMenu')
const GroupUpdate = require('../components/GroupUpdate')
const {
	Tag
} = require('../components/Tag')
const {
	actionCreators,
	analytics,
	selectors,
	sdk
} = require('../core')
const helpers = require('../services/helpers')
const index = require('./index')
const Icon = require('../shame/Icon')
const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP'
const EllipsisButton = styledComponents.default(rendition.Button) `
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
		<rendition.Box p={2}>
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
			<rendition.Txt>{card.name}</rendition.Txt>

			{arr && (
				<rendition.Pill bg="#2297DE">
					Projected ARR: {arr.toFixed(2)}
				</rendition.Pill>
			)}

		</rendition.Box>
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
		return (<div>
			<strong>{props.title}</strong>
			<EllipsisButton px={2} plaintext onClick={this.toggleMenu}>
				<Icon.default name="ellipsis-v"/>
			</EllipsisButton>

			{this.state.showMenu && (
				<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
					<rendition.Button plaintext onClick={this.toggleUpdateModal}>
					Update all items in this list
					</rendition.Button>
				</ContextMenu.ContextMenu>
			)}

			{this.state.showUpdateModal && (
				<GroupUpdate.GroupUpdate cards={props.cards} schema={props.schema} onClose={this.toggleUpdateModal}/>
			)}
		</div>)
	}
}
class Kanban extends React.Component {
	constructor (props) {
		super(props)
		this.handleDragEnd = (cardId, _sourceLaneId, targetLaneId) => {
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
		this.onCardClick = (cardId) => {
			const card = _.find(this.props.tail, {
				id: cardId
			})
			this.setState({
				modalChannel: {
					target: cardId,
					cardType: card.type
				}
			})
		}
		this.clearModalChannel = () => {
			this.setState({
				modalChannel: null
			})
		}
		this.state = {
			modalChannel: null
		}

		this.openCreateChannel = () => {
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
			const validator = sdk.utils.compileSchema(schema)
			const [ slicedCards, remaining ] = _.partition(cards, (card) => {
				return validator(card)
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
	getSeedData () {
		const {
			head
		} = this.props.channel.data
		if (!head || head.type !== 'view') {
			return {}
		}
		const schema = helpers.getViewSchema(head, this.props.user)
		if (!schema) {
			return {}
		}
		return helpers.getUpdateObjectFromSchema(schema)
	}
	render () {
		const data = {
			lanes: this.getLanes()
		}
		const {
			type
		} = this.props
		const typeName = type ? type.name || type.slug : ''
		let lens = null
		if (this.state.modalChannel) {
			const lenses = index.default.getLenses(this.state.modalChannel.data.head, this.props.user)
			lens = lenses[0]
		}
		return (<rendition.Flex flexDirection="column" style={{
			height: '100%', width: '100%', position: 'relative'
		}}>
			<reactTrello.default
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
			</reactTrello.default>

			{Boolean(this.state.modalChannel) && Boolean(lens) && (
				<rendition.Modal w={960} done={this.clearModalChannel}>
					<lens.data.renderer channel={this.state.modalChannel} card={this.state.modalChannel.data.head}/>
				</rendition.Modal>
			)}
			{Boolean(type) && (
				<React.Fragment>
					<rendition.Button
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
					</rendition.Button>
				</React.Fragment>
			)}
		</rendition.Flex>)
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
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
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
		renderer: connect(mapStateToProps, mapDispatchToProps)(Kanban),
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
exports.default = lens
