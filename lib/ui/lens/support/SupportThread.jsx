/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	circularDeepEqual
} = require('fast-equals')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const styledComponents = require('styled-components')
const CardActions = require('../../components/CardActions')
const CardField = require('../../components/CardField').default
const Event = require('../../components/Event').default
const Label = require('../../components/Label')
const Tag = require('../../components/Tag')
const core = require('../../core')
const store = require('../../core/store')
const helpers = require('../../services/helpers')
const SupportThreadTimeline = require('./SupportThreadTimeline')
const ActionLink = require('../../shame/ActionLink')
const CloseButton = require('../../shame/CloseButton')
const ColorHashPill = require('../../shame/ColorHashPill')
const Column = require('../../shame/Column').default
const Icon = require('../../shame/Icon')
const IconButton = require('../../shame/IconButton')

const {
	getCreator,
	getLastUpdate
} = require('./utils')

const Extract = styledComponents.default(rendition.Box) `
	border-top: 1px solid ${rendition.Theme.colors.gray.light};
	border-bottom: 1px solid ${rendition.Theme.colors.gray.light};
`
const transformMirror = (mirror) => {
	if (mirror.includes('frontapp.com')) {
		const id = mirror.split('/').pop()
		return `https://app.frontapp.com/open/${id}`
	}
	return mirror
}

const getHighlights = (card) => {
	const list = _.sortBy(_.filter(_.get(card, [ 'links', 'has attached element' ]), (event) => {
		if (!_.includes([ 'message', 'whisper' ], event.type)) {
			return false
		}
		const message = _.get(event, [ 'data', 'payload', 'message' ])
		return Boolean(message) && Boolean(message.match(/(#summary|#status)/))
	}), 'data.timestamp')
	return _.uniqBy(list, (item) => {
		return _.get(item, [ 'data', 'payload', 'message' ])
	})
}

class SupportThreadBase extends React.Component {
	constructor (props) {
		super(props)
		this.close = () => {
			core.sdk.card.update(this.props.card.id, _.merge({}, this.props.card, {
				data: {
					status: 'closed'
				}
			}))
				.then(() => {
					this.props.actions.addNotification('success', 'Close this support thread')
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.handleExpandToggle = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}
		this.state = {
			linkedSupportIssues: [],
			showHighlights: false,
			expanded: false
		}
		this.loadLinks(props.card.id)

		this.setCategory = this.setCategory.bind(this)
		this.openSupportIssueView = this.openSupportIssueView.bind(this)
	}

	openSupportIssueView () {
		const newChannel = helpers.createChannel({
			target: 'view-all-support-issues',
			cardType: 'view',
			parentChannel: this.props.channel.id
		})
		this.props.actions.addChannel(newChannel)
	}

	setCategory (event) {
		event.preventDefault()

		const category = event.target.dataset.category

		if (category === _.get(this.props.card, [ 'data', 'category' ])) {
			return
		}

		const update = _.cloneDeep(this.props.card)
		_.set(update, [ 'data', 'category' ], category)

		core.sdk.card.update(update.id, update)
			.then(() => {
				this.props.actions.addNotification('success', `Successfully set support thread category to: ${category}`)
				this.props.actions.removeChannel(this.props.channel)
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error)
			})
	}

	loadLinks (id) {
		core.sdk.query({
			$$links: {
				'support thread is attached to support issue': {
					type: 'object',
					additionalProperties: true
				}
			},
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id
				},
				type: {
					type: 'string',
					const: 'support-thread'
				}
			},
			additionalProperties: true
		})
			.then(([ result ]) => {
				if (result) {
					this.setState({
						linkedSupportIssues: _.get(result, [ 'links', 'support thread is attached to support issue' ])
					})
				}
			})
	}
	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextProps, this.props) || !circularDeepEqual(nextState, this.state)
	}
	componentWillUpdate (nextProps) {
		if (
			(nextProps.card.id !== this.props.card.id) ||
			!circularDeepEqual(
				nextProps.card.links['support thread is attached to support issue'],
				this.props.card.links['support thread is attached to support issue']
			)
		) {
			this.loadLinks(nextProps.card.id)
		}
	}
	render () {
		const {
			card, fieldOrder
		} = this.props
		const payload = card.data
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})
		const typeSchema = _.get(typeCard, [ 'data', 'schema' ])
		const localSchema = helpers.getLocalSchema(card)
		const defaultCategory = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'default' ])
		const categoryOptions = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'enum' ])

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

		// Omit the status and inbox fields as they are rendered seperately, also
		// omit some fields that are used by the sync functionality
		const keys = _.without((fieldOrder || []).concat(unorderedKeys),
			'status',
			'inbox',
			'origin',
			'environment',
			'translateDate'
		)
		const actor = getCreator(card)
		const highlights = getHighlights(card)
		return (
			<Column
				flex={this.props.flex}
				data-test-component="column"
				data-test-id={card.id}
				overflowY
			>
				<rendition.Box
					px={3}
					pt={3}
				>
					<rendition.Flex mb={1} justify="space-between">
						<rendition.Flex align="center">
							<ColorHashPill.default value={_.get(card, [ 'data', 'inbox' ])} mr={2} />
							<ColorHashPill.default value={_.get(card, [ 'data', 'status' ])} mr={2} />

							{Boolean(card.tags) && _.map(card.tags, (tag) => {
								if (tag === 'status' || tag === 'summary') {
									return null
								}
								return <Tag.Tag key={tag} mr={2}>#{tag}</Tag.Tag>
							})}
						</rendition.Flex>

						<rendition.Flex align="center">
							<rendition.DropDownButton
								primary
								label={_.get(card, [ 'data', 'category' ], defaultCategory)}
								joined
								outline
							>
								{_.map(categoryOptions, (item) => {
									return (
										<rendition.Link
											data-category={item}
											key={item}
											onClick={this.setCategory}
										>
											{item}
										</rendition.Link>
									)
								})}
							</rendition.DropDownButton>

							<IconButton.IconButton plaintext square mr={1} tooltip={{
								placement: 'bottom',
								text: 'Close this support thread'
							}} onClick={this.close}>
								<Icon.default name="archive"/>
							</IconButton.IconButton>

							<CardActions.CardActions card={card}>
								<ActionLink.ActionLink onClick={this.openSupportIssueView}>
									Search support issues
								</ActionLink.ActionLink>
							</CardActions.CardActions>

							<CloseButton.CloseButton
								mr={-3}
								onClick={() => {
									return this.props.actions.removeChannel(this.props.channel)
								}}
							/>
						</rendition.Flex>
					</rendition.Flex>

					<rendition.Flex justify="space-between" mt={3}>
						<rendition.Txt mb={1} tooltip={actor.email}>
								Conversation with <strong>{actor.name}</strong>
						</rendition.Txt>

						<rendition.Txt>Created {helpers.formatTimestamp(card.created_at)}</rendition.Txt>
					</rendition.Flex>

					<rendition.Flex justify="space-between">
						<rendition.Box>
							{Boolean(card.name) && (<rendition.Txt bold>{card.name}</rendition.Txt>)}
						</rendition.Box>

						<rendition.Txt>
							Updated {helpers.timeAgo(_.get(getLastUpdate(card), [ 'data', 'timestamp' ]))}
						</rendition.Txt>
					</rendition.Flex>

					{!this.state.expanded && (
						<rendition.Link
							onClick={this.handleExpandToggle}
							mt={2}
							data-test="support-thread__expand"
						>
							More
						</rendition.Link>
					)}

					{this.state.expanded && (
						<React.Fragment>
							{highlights.length > 0 && (<div>
								<strong>
									<rendition.Link mt={1} onClick={() => {
										return this.setState({
											showHighlights: !this.state.showHighlights
										})
									}}>
													Highlights{' '}
										<Icon.default name={`caret-${this.state.showHighlights ? 'down' : 'right'}`}/>
									</rendition.Link>
								</strong>
							</div>)}

							{this.state.showHighlights && (<Extract py={2}>
								{_.map(highlights, (statusEvent) => {
									return (
										<Event key={statusEvent.id} card={statusEvent} mb={1}/>
									)
								})}
							</Extract>)}

							{_.map(this.state.linkedSupportIssues, (entry) => {
								return (
									<rendition.Link
										mr={2}
										href={`/#support-issue~${entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-support-issue"
									>
										{entry.name}
									</rendition.Link>
								)
							})}

							{_.map(keys, (key) => {
								if (key === 'mirrors' && payload[key]) {
									return (
										<React.Fragment key={key}>
											<Label.default my={3}>{key}</Label.default>
											{payload[key].map((mirror) => {
												const url = transformMirror(mirror)
												return <rendition.Link key={url} blank href={url}>{url}</rendition.Link>
											})}
										</React.Fragment>
									)
								}

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
								<rendition.Link mt={3} onClick={this.handleExpandToggle}>
									Less
								</rendition.Link>
							</rendition.Box>
						</React.Fragment>
					)}
				</rendition.Box>

				<rendition.Box flex="1" style={{
					minHeight: 0
				}}>
					<SupportThreadTimeline.default.data.renderer
						card={this.props.card}
						tail={this.props.card.links['has attached element']}
					/>
				</rendition.Box>
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		allUsers: store.selectors.getAllUsers(state),
		accounts: store.selectors.getAccounts(state),
		types: store.selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}

exports.Renderer = connect(mapStateToProps, mapDispatchToProps)(SupportThreadBase)
const lens = {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		renderer: exports.Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread'
				}
			}
		}
	}
}
exports.default = lens
