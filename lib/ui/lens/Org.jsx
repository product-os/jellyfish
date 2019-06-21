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
const AsyncSelect = require('react-select/lib/Async').default
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
const Timeline = require('./Timeline')
const CloseButton = require('../shame/CloseButton')
const Column = require('../shame/Column').default
const Icon = require('../shame/Icon').default
const Link = require('../components/Link').default

class Org extends React.Component {
	constructor (props) {
		super(props)
		this.handleUserSelect = (selectedUser) => {
			this.setState({
				selectedUser
			})
		}
		this.addMember = async () => {
			if (!this.state.selectedUser || this.state.addingMember) {
				return
			}

			this.setState({
				addingMember: true
			})

			const user = await this.props.actions.getActor(this.state.selectedUser.value)

			if (!user) {
				return
			}

			this.props.actions.createLink(this.props.card, user.card, 'has member')
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
		this.state = {
			selectedUser: null,
			addingMember: false,
			members: null
		}

		this.getMembers = this.getMembers.bind(this)
	}

	componentDidMount () {
		this.loadMembers()
	}

	componentDidUpdate (prevProps) {
		if (prevProps.card.linked_at['has member'] !== this.props.card.linked_at['has member']) {
			this.loadMembers()
		}
	}

	async loadMembers () {
		try {
			const result = await this.props.actions.queryAPI({
				$$links: {
					'has member': {
						type: 'object',
						additionalProperties: true
					}
				},
				type: 'object',
				properties: {
					type: {
						const: 'org'
					},
					slug: {
						const: this.props.card.slug
					},
					links: {
						type: 'object'
					}
				},
				required: [ 'type', 'slug' ]
			}, {
				sortBy: 'slug',
				limit: 1
			})

			if (result[0]) {
				this.setState({
					members: result[0].links['has member']
				})
			}
		} catch (error) {
			this.props.actions.addNotification('danger', error.message || error)
		}
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async getMembers (value) {
		try {
			const memberIds = _.map(this.state.members, 'id')
			const results = await this.props.actions.queryAPI({
				type: 'object',
				properties: {
					type: {
						const: 'user'
					},
					slug: {
						pattern: value
					}
				},
				required: [ 'type', 'slug' ],
				additionalProperties: true
			}, {
				limit: 10,
				sortBy: 'slug'
			})

			const memberOptions = results.filter((user) => {
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

			return memberOptions
		} catch (error) {
			this.props.actions.addNotification('danger', error.message || error)
		}

		return null
	}

	render () {
		const {
			card,
			fieldOrder,
			level
		} = this.props

		const {
			members
		} = this.state

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

		const content = (
			<React.Fragment>
				<rendition.Flex justifyContent="space-between">
					<rendition.Txt mb={3}>
						<strong>
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
								channel={this.props.channel}
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
							schema={_.get(schema, [ 'properties', 'data', 'properties', key ])}
						/>
						: null
				})}

				<rendition.Box>
					{members === null && (
						<Icon spin name="cog"/>
					)}

					{Boolean(members) && (
						<React.Fragment>
							<Label>Members ({members.length})</Label>
							<rendition.Box style={{
								overflow: 'auto',
								maxHeight: 150
							}}>
								{_.map(members, (member) => {
									return (
										<Link
											key={member.id}
											id={member.id}
											append={member.id}
											style={{
												display: 'block'
											}}
										>
											{member.slug}
										</Link>
									)
								})}
							</rendition.Box>
						</React.Fragment>
					)}

					<rendition.Box mt={3}>

						<AsyncSelect
							value={this.state.selectedUser}
							cacheOptions defaultOptions
							onChange={this.handleUserSelect}
							loadOptions={this.getMembers}
						/>

						<rendition.Button
							mt={3}
							success
							disabled={!this.state.selectedUser || this.state.addingMember}
							onClick={this.addMember}
						>
							{this.state.addingMember
								? <Icon spin name="cog"/>
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
		types: selectors.getTypes(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'createLink',
				'getActor',
				'queryAPI'
			]),
			dispatch
		)
	}
}
exports.Renderer = connect(mapStateToProps, mapDispatchToProps)(Org)
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
