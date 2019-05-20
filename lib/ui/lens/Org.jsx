/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	circularDeepEqual
}	= require('fast-equals')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const reactSelect = require('react-select')
const redux = require('redux')
const rendition = require('rendition')
const CardActions = require('../components/CardActions').default
const CardField = require('../components/CardField').default
const Label = require('../components/Label')
const Tag = require('../components/Tag')
const {
	actionCreators,
	selectors
} = require('../core')
const helpers = require('../services/helpers')
const link = require('../services/link')
const Timeline = require('./Timeline')
const CloseButton = require('../shame/CloseButton')
const Column = require('../shame/Column').default
const Icon = require('../shame/Icon').default

class Base extends React.Component {
	constructor (props) {
		super(props)
		this.handleUserSelect = (selectedUser) => {
			this.setState({
				selectedUser
			})
		}
		this.addMember = () => {
			if (!this.state.selectedUser || this.state.addingMember) {
				return
			}
			const user = _.find(this.props.allUsers, {
				id: this.state.selectedUser.value
			})
			if (!user) {
				return
			}
			this.setState({
				addingMember: true
			})
			link.createLink(this.props.card, user, 'has member')
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
				.finally(() => {
					this.setState({
						addingMember: false,
						selectedUser: null
					})
				})
		}
		this.openChannel = () => {
			if (this.props.level === 0) {
				return
			}
			const {
				card
			} = this.props
			this.props.actions.addChannel({
				cardType: card.type,
				target: card.id
			})
		}
		this.openUserChannel = (event) => {
			event.preventDefault()
			const id = event.currentTarget.id
			this.props.actions.addChannel({
				cardType: 'user',
				target: id
			})
		}
		this.close = () => {
			this.props.actions.removeChannel(this.props.channel)
		}
		this.state = {
			selectedUser: null,
			addingMember: false
		}
	}
	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}
	render () {
		const {
			card, fieldOrder, level
		} = this.props
		const payload = card.data
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})
		const typeSchema = _.get(typeCard, [ 'data', 'schema' ])
		const localSchema = helpers.getLocalSchema(card)

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({}, {
			type: 'object',
			properties: {
				data: localSchema
			}
		}, typeSchema)
		const unorderedKeys = _.filter(_.keys(payload), (key) => {
			return !_.includes(fieldOrder, key)
		})
		const keys = (fieldOrder || []).concat(unorderedKeys)
		const cardSlug = _.get(card, [ 'slug' ])
		const cardType = _.get(card, [ 'type' ])
		const memberIds = _.map(card.links['has member'], 'id')
		const memberOptions = this.props.allUsers.filter((user) => {
			return !_.includes(memberIds, user.id)
		})
			.map(({
				id, slug
			}) => {
				return {
					value: id,
					label: slug
				}
			})
		const content = (
			<React.Fragment>
				<rendition.Flex justifyContent="space-between">
					<rendition.Txt mb={3}>
						<strong>
							{level > 0 && (
								<rendition.Link
									onClick={this.openChannel}
									className={`header-link header-link--${card.slug || card.id}`}
								>
									{card.name || card.slug || card.type}
								</rendition.Link>
							)}
							{!level && (
								<div
									style={{
										fontSize: 14, display: 'block'
									}}
								>
									{card.name || card.slug || card.type}
								</div>
							)}
						</strong>
					</rendition.Txt>

					{!level && (
						<rendition.Flex align="baseline">
							<CardActions card={card}/>

							<CloseButton.CloseButton
								ml={3}
								onClick={this.close}
							/>
						</rendition.Flex>
					)}
				</rendition.Flex>

				{Boolean(card.tags) && card.tags.length > 0 &&
							<rendition.Box mb={1}>
								{_.map(card.tags, (tag) => {
									return <Tag.Tag mr={1}>#{tag}</Tag.Tag>
								})}
							</rendition.Box>}

				{_.map(keys, (key) => {
					return payload[key]
						? <CardField
							key={key}
							field={key}
							payload={payload}
							users={this.props.allUsers}
							schema={_.get(schema, [ 'properties', 'data', 'properties', key ])}
						/>
						: null
				})}

				<rendition.Box>
					<Label.default>Members ({memberIds.length})</Label.default>
					<rendition.Box style={{
						overflow: 'auto',
						maxHeight: 150
					}}>
						{_.map(memberIds, (id) => {
							return (
								<rendition.Link
									id={id}
									onClick={this.openUserChannel}
									href={`${window.location.hash}/${id}`}
									style={{
										display: 'block'
									}}
								>
									{_.get(_.find(this.props.allUsers, {
										id
									}), [ 'slug' ])}
								</rendition.Link>
							)
						})}
					</rendition.Box>

					<rendition.Box mt={3}>

						<reactSelect.default
							value={this.state.selectedUser}
							onChange={this.handleUserSelect}
							options={memberOptions}
						/>

						<rendition.Button
							mt={3}
							success
							disabled={!this.state.selectedUser || this.state.addingMember}
							onClick={this.addMember}
						>
							{this.state.addingMember
								? <Icon spin class="cog"/>
								: 'Add member'}
						</rendition.Button>
					</rendition.Box>
				</rendition.Box>
			</React.Fragment>
		)
		if (!level) {
			return (
				<Column
					className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
					flex={this.props.flex}
				>
					<rendition.Box p={3} flex="1" style={{
						overflowY: 'auto'
					}}>
						{content}
					</rendition.Box>

					<rendition.Box style={{
						maxHeight: '50%'
					}} flex="0">
						<Timeline.default.data.renderer card={this.props.card}/>
					</rendition.Box>
				</Column>
			)
		}
		return (<rendition.Box mb={3}>
			{content}
		</rendition.Box>)
	}
}
const mapStateToProps = (state) => {
	return {
		allUsers: selectors.getAllUsers(state),
		types: selectors.getTypes(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification',
				'removeChannel'
			]),
			dispatch
		)
	}
}
exports.Renderer = connect(mapStateToProps, mapDispatchToProps)(Base)
const lens = {
	slug: 'lens-org',
	type: 'lens',
	version: '1.0.0',
	name: 'Org lens',
	data: {
		icon: 'address-card',
		renderer: exports.Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'org'
				}
			}
		}
	}
}
exports.default = lens
