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
const CardActions = require('../components/CardActions')
const Label = require('../components/Label')
const Tag = require('../components/Tag')
const store = require('../core/store')
const helpers = require('../services/helpers')
const storeHelpers = require('../services/store-helpers')
const Timeline = require('./Timeline')
const CloseButton = require('../shame/CloseButton')
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
const CardField = ({
	field, payload, users, schema
}) => {
	const value = payload[field]
	// eslint-disable-next-line no-undefined
	if (value === undefined) {
		return null
	}

	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length
		if (!len || !users) {
			return null
		}
		const names = value.map((id) => {
			return storeHelpers.getActor(id).name
		})
		return (<Badge tooltip={names.join(', ')} my={1}>
			{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
		</Badge>)
	}
	if (field === 'actor') {
		return <rendition.Txt my={3} bold>{storeHelpers.getActor(value).name}</rendition.Txt>
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
		this.openChannel = () => {
			if (this.props.level === 0) {
				return
			}
			const {
				card
			} = this.props
			this.props.actions.addChannel(helpers.createChannel({
				cardType: card.type,
				target: card.id,
				head: card
			}))
		}
	}
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
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
		return (
			<Column
				className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
				flex={this.props.flex}
				flexDirection="column"
			>
				<rendition.Box p={3} pb={0}>
					<rendition.Flex justify="space-between">
						{card.created_at && (<rendition.Txt mb={3}>
							<strong>
										Thread created at {helpers.formatTimestamp(card.created_at)}
							</strong>
						</rendition.Txt>)}

						{!level && (<rendition.Flex align="baseline">
							<CardActions.CardActions card={card}/>

							<CloseButton.CloseButton
								mb={3}
								mr={-3}
								onClick={() => {
									return this.props.actions.removeChannel(this.props.channel)
								}}
							/>
						</rendition.Flex>)}
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
				</rendition.Box>

				<rendition.Box flex="1" style={{
					minHeight: 0
				}}>
					<Timeline.default.data.renderer card={this.props.card} tail={this.props.card.links['has attached element']}/>
				</rendition.Box>
			</Column>
		)
	}
}
const mapStateToProps = (state) => {
	return {
		allUsers: store.selectors.getAllUsers(state),
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
	slug: 'lens-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: exports.Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'thread'
				}
			}
		}
	}
}
exports.default = lens
