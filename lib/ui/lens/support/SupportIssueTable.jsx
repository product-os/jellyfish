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
const {
	actionCreators
} = require('../../core')
const helpers = require('../../services/helpers')
const Column = require('../../shame/Column').default
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
	openChannel (card) {
		this.props.actions.addChannel({
			cardType: card.type,
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id
		})
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
		return (<Column flex="1" overflowY>
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
							onClick={this.openCreateChannel}
						>
							Add {this.props.type.name || this.props.type.slug}
						</rendition.Button>
					</rendition.Flex>
				</React.Fragment>
			)}
		</Column>)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addChannel: redux.bindActionCreators(actionCreators.addChannel, dispatch)
		}
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
