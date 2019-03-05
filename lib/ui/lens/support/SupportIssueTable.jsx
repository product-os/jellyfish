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
const redux = require('redux')
const rendition = require('rendition')
const styledComponents = require('styled-components')
const CardCreator = require('../../components/CardCreator')
const store = require('../../core/store')
const helpers = require('../../services/helpers')
const Icon = require('../../shame/Icon')
const Column = styledComponents.default(rendition.Flex) `
	height: 100%;
	min-width: 330px;
	overflow-y: auto;
`
const COLUMNS = [
	{
		field: 'name',
		sortable: true,
		render: (value) => {
			return <rendition.Link>{value}</rendition.Link>
		}
	},
	{
		field: 'category',
		label: 'Category',
		sortable: true
	},
	{
		field: 'Created',
		sortable: true,
		render: (value) => {
			return value ? helpers.formatTimestamp(value) : null
		}
	},
	{
		field: 'Updated',
		sortable: true
	},
	{
		field: 'fixedInOSVersion',
		label: 'Fixed in OS?',
		sortable: true
	},
	{
		field: 'fixedInSupervisorVersion',
		label: 'Fixed in supervisor?',
		sortable: true
	}
]
class CardTable extends React.Component {
	constructor (props) {
		super(props)
		this.showNewCardModal = () => {
			this.setState({
				showNewCardModal: true
			})
		}
		this.hideNewCardModal = () => {
			this.setState({
				showNewCardModal: false
			})
		}
		this.startCreatingCard = () => {
			this.hideNewCardModal()
			this.setState({
				creatingCard: true
			})
		}
		this.doneCreatingCard = (card) => {
			if (card) {
				this.openChannel(card)
			}
			this.setState({
				creatingCard: false
			})
		}
		this.cancelCreatingCard = () => {
			this.hideNewCardModal()
			this.setState({
				creatingCard: false
			})
		}
		this.state = {
			creatingCard: false,
			showNewCardModal: false
		}
	}
	openChannel (card) {
		this.props.actions.addChannel(helpers.createChannel({
			cardType: card.type,
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id
		}))
	}
	getSeedData () {
		const {
			head
		} = this.props.channel.data
		if (!head || head.type !== 'view') {
			return {}
		}
		const schema = helpers.getViewSchema(head)
		if (!schema) {
			return {}
		}
		return helpers.getUpdateObjectFromSchema(schema)
	}
	render () {
		const tail = this.props.tail ? _.map(this.props.tail, (card) => {
			const update = _.find(_.get(card, [ 'links', 'has attached element' ]), {
				type: 'update'
			})
			return {
				name: card.name,
				id: card.id,
				Created: card.created_at,
				Update: _.get(update, [ 'data', 'timestamp' ], null),
				category: card.data.category,
				fixedInOSVersion: card.data.fixedInOSVersion,
				fixedInSupervisorVersion: card.data.fixedInSupervisorVersion
			}
		}) : null
		return (<Column flex="1" flexDirection="column">
			<rendition.Box flex="1" style={{
				position: 'relative'
			}}>
				{Boolean(tail) && tail.length > 0 && (<rendition.Table rowKey="id" data={tail} columns={COLUMNS} onRowClick={({
					id
				}) => {
					return this.openChannel(_.find(this.props.tail, {
						id
					}))
				}}/>)}
				{Boolean(tail) && tail.length === 0 &&
            <rendition.Txt.p p={3}>No results found</rendition.Txt.p>}
			</rendition.Box>

			{Boolean(this.props.type) && (
				<React.Fragment>
					<rendition.Flex
						p={3}
						style={{
							borderTop: '1px solid #eee'
						}}
						justify="flex-end"
					>
						<rendition.Button
							success={true}
							onClick={this.showNewCardModal}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon.default name="cog fa-spin"/>}
							{!this.state.creatingCard &&
						<span>Add {this.props.type.name || this.props.type.slug}</span>}
						</rendition.Button>
					</rendition.Flex>

					<CardCreator.CardCreator
						seed={this.getSeedData()}
						show={this.state.showNewCardModal}
						type={this.props.type}
						onCreate={this.startCreatingCard}
						done={this.doneCreatingCard}
						cancel={this.cancelCreatingCard}
					/>
				</React.Fragment>
			)}
		</Column>)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
const lens = {
	slug: 'lens-support-issue-table',
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CardTable),
		icon: 'table',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					},
					type: {
						const: 'support-issue',
						type: 'string'
					}
				}
			}
		}
	}
}
exports.default = lens
