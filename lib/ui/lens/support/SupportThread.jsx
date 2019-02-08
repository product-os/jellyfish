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
const Markdown = require('rendition/dist/extra/Markdown')
const Mermaid = require('rendition/dist/extra/Mermaid')
const styledComponents = require('styled-components')
const CardActions = require('../../components/CardActions')
const Event = require('../../components/Event')
const Label = require('../../components/Label')
const Tag = require('../../components/Tag')
const core = require('../../core')
const store = require('../../core/store')
const helpers = require('../../services/helpers')
const storeHelpers = require('../../services/store-helpers')
const SupportThreadTimeline = require('./SupportThreadTimeline')
const CloseButton = require('../../shame/CloseButton')
const Icon = require('../../shame/Icon')
const IconButton = require('../../shame/IconButton')
const Extract = styledComponents.default(rendition.Box) `
	border-top: 1px solid ${rendition.Theme.colors.gray.light};
	border-bottom: 1px solid ${rendition.Theme.colors.gray.light};
`
const Column = styledComponents.default(rendition.Flex) `
	height: 100%;
	overflow-y: auto;
	min-width: 270px;
`
const Badge = styledComponents.default(rendition.Txt) `
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`
const DataContainer = styledComponents.default.pre `
	background: none;
	color: inherit;
	border: 0;
	margin: 0;
	padding: 0;
	font-size: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
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
		return Boolean(event.data.payload.message.match(/(#summary|#status)/))
	}), 'data.timestamp')
	return _.uniqBy(list, (item) => {
		return _.get(item, [ 'data', 'payload', 'message' ])
	})
}
const CardField = ({
	field, payload, users, schema
}) => {
	const value = payload[field]
	if (typeof value === 'undefined') {
		return null
	}

	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}
	if (field === 'mirrors') {
		return (<React.Fragment>
			<Label.default my={3}>{field}</Label.default>
			{value.map((mirror) => {
				const url = transformMirror(mirror)
				return <rendition.Link key={url} blank href={url}>{url}</rendition.Link>
			})}
		</React.Fragment>)
	}
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length
		if (!len || !users) {
			return null
		}
		const names = value.map((id) => {
			return helpers.findUsernameById(users, id)
		})
		return (
			<Badge tooltip={names.join(', ')} my={1}>
				{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
			</Badge>
		)
	}
	if (field === 'actor') {
		return <rendition.Txt my={3} bold>{helpers.findUsernameById(users, value)}</rendition.Txt>
	}

	// Rendering can be optimzed for some known fields
	if (field === 'timestamp') {
		return <rendition.Txt my={3} color="#777">{helpers.formatTimestamp(value)}</rendition.Txt>
	}
	if (schema && schema.format === 'mermaid') {
		return (<React.Fragment>
			<Label.default my={3}>{field}</Label.default>
			<Mermaid.Mermaid value={value}/>
		</React.Fragment>)
	}
	if (schema && schema.format === 'markdown') {
		return (<React.Fragment>
			<Label.default my={3}>{field}</Label.default>
			<Markdown.Markdown>{value}</Markdown.Markdown>
		</React.Fragment>)
	}
	return (<React.Fragment>
		<Label.default my={3}>{field}</Label.default>
		{_.isObject(payload[field])
			? <rendition.Txt monospace={true}>
				<DataContainer>{JSON.stringify(payload[field], null, 4)}</DataContainer>
			</rendition.Txt>
			: <rendition.Txt>{`${payload[field]}`}</rendition.Txt>}
	</React.Fragment>)
}
class Base extends React.Component {
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
		if (nextProps.card.id !== this.props.card.id) {
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
		const createCard = _.first(card.links['has attached element'])
		const highlights = getHighlights(card)
		const actor = storeHelpers.getActor(_.get(createCard, [ 'data', 'actor' ]))
		return (
			<Column
				flex={this.props.flex}
				className={`column--${card ? card.slug || card.type : 'unknown'}`}
				flexDirection="column"
			>
				<rendition.Box
					px={3}
					pt={3}
					mb={-24}
					style={{
						overflowY: 'auto'
					}}
				>
					<rendition.Flex mb={1} justify="space-between">
						<rendition.Flex align="center">
							{card.data.inbox && (
								<rendition.Pill mr={3} bg={helpers.colorHash(card.data.inbox)}>
									{card.data.inbox}
								</rendition.Pill>
							)}

							{Boolean(card.tags) && _.map(card.tags, (tag) => {
								if (tag === 'status' || tag === 'summary') {
									return null
								}
								return <Tag.Tag key={tag} mr={2}>#{tag}</Tag.Tag>
							})}
						</rendition.Flex>

						<rendition.Flex>
							<IconButton.IconButton plaintext square mr={1} tooltip={{
								placement: 'bottom',
								text: 'Close this support thread'
							}} onClick={this.close}>
								<Icon.default name="archive"/>
							</IconButton.IconButton>

							<CardActions.CardActions card={card}/>

							<CloseButton.CloseButton
								mr={-3}
								onClick={() => {
									return this.props.actions.removeChannel(this.props.channel)
								}}
							/>
						</rendition.Flex>
					</rendition.Flex>

					<rendition.Flex justify="space-between" mt={3}>
						<rendition.Txt mb={1}>
								Conversation with <strong>{actor.name}</strong>
						</rendition.Txt>

						<rendition.Txt>Created {helpers.formatTimestamp(card.created_at)}</rendition.Txt>
					</rendition.Flex>

					<rendition.Flex justify="space-between">
						<rendition.Box>
							{Boolean(card.name) && (<rendition.Txt bold>{card.name}</rendition.Txt>)}
						</rendition.Box>

						<rendition.Txt>
							Updated {helpers.timeAgo(_.get(_.last(card.links['has attached element']), [ 'data', 'timestamp' ]))}
						</rendition.Txt>
					</rendition.Flex>

					{!this.state.expanded && (
						<rendition.Link onClick={this.handleExpandToggle} mt={2}>
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
									return (<Event.Event card={statusEvent} mb={1}/>)
								})}
							</Extract>)}

							{_.map(this.state.linkedSupportIssues, (entry) => {
								return (<rendition.Link mr={2} href={`/#${entry.id}`}>{entry.name}</rendition.Link>)
							})}

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

							<rendition.Link mt={3} onClick={this.handleExpandToggle}>
										Less
							</rendition.Link>
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
exports.Renderer = connect(mapStateToProps, mapDispatchToProps)(Base)
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
