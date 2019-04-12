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
const {
	actionCreators,
	selectors
} = require('../core')
const helpers = require('../services/helpers')
const CardActions = require('./CardActions')
const Label = require('./Label')
const Tag = require('./Tag')
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
	if (typeof value === 'undefined') {
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
			return helpers.findUsernameById(users, id)
		})
		return (<Badge tooltip={names.join(', ')} my={1}>
			{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
		</Badge>)
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
		this.openChannel = () => {
			if (!this.props.channel) {
				return
			}
			const {
				card
			} = this.props
			this.props.actions.addChannel({
				target: card.id,
				cardType: card.type,
				head: card,
				parentChannel: this.props.channel.id
			})
		}
		this.delete = () => {
			const {
				channel
			} = this.props
			if (channel) {
				this.props.actions.removeChannel(channel)
			}
		}
	}
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}
	render () {
		const payload = this.props.card.data
		const {
			card, fieldOrder, channel
		} = this.props
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
		const inView = _.get(channel, [ 'data', 'head', 'type' ]) === 'view'
		return (<rendition.Box mb={3}>
			<rendition.Flex justify="space-between">
				<rendition.Heading.h4 my={3}>
					{inView && (
						<rendition.Link onClick={this.openChannel}>
							{card.name || card.slug || card.type}
						</rendition.Link>
					)}
					{!inView && (card.name || card.slug || card.type)}
				</rendition.Heading.h4>

				{!inView &&
            <CardActions.CardActions card={card}/>}
			</rendition.Flex>

			{Boolean(card.tags) && card.tags.length > 0 && (
				<rendition.Box mb={1}>
					{_.map(card.tags, (tag) => {
						return <Tag.Tag mr={1}>#{tag}</Tag.Tag>
					})}
				</rendition.Box>
			)}

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
				'removeChannel'
			]),
			dispatch
		)
	}
}
exports.CardRenderer = connect(mapStateToProps, mapDispatchToProps)(Base)
