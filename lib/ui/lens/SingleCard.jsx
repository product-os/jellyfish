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
const CardActions = require('../components/CardActions')
const CardField = require('../components/CardField').default
const Tag = require('../components/Tag')
const {
	actionCreators,
	selectors
} = require('../core')
const helpers = require('../services/helpers')
const Timeline = require('./Timeline')
const CloseButton = require('../shame/CloseButton')
const Column = require('../shame/Column').default

class SingleCard extends React.Component {
	constructor (props) {
		super(props)
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

		this.close = () => {
			this.props.actions.removeChannel(this.props.channel)
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

					{!level && (<rendition.Flex align="baseline">
						<CardActions.CardActions card={card}/>

						<CloseButton.CloseButton
							ml={3}
							onClick={this.close}
						/>
					</rendition.Flex>)}
				</rendition.Flex>

				{Boolean(card.tags) && card.tags.length > 0 && (
					<rendition.Box mb={1}>
						{_.map(card.tags, (tag) => {
							return <Tag.Tag key={tag} mr={1}>#{tag}</Tag.Tag>
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
			</React.Fragment>
		)
		if (!level) {
			return (
				<Column
					className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
					flex={this.props.flex}
					overflowY
				>
					<rendition.Box p={3} flex="1" style={{
						overflowY: 'auto'
					}}>
						{content}
					</rendition.Box>
					<rendition.Box
						style={{
							maxHeight: '50%'
						}}
						flex="0"
					>
						<Timeline.default.data.renderer
							card={this.props.card}
							tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
						/>
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
				'removeChannel'
			]),
			dispatch
		)
	}
}
exports.Renderer = connect(mapStateToProps, mapDispatchToProps)(SingleCard)
const lens = {
	slug: 'lens-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: exports.Renderer,
		filter: {
			type: 'object'
		}
	}
}
exports.default = lens
