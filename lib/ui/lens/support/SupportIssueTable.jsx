/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Box,
	Button,
	Flex,
	Link,
	Table,
	Txt
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../core'
import helpers from '../../services/helpers'
import Column from '../../shame/Column'

const COLUMNS = [
	{
		field: 'name',
		sortable: true,
		render: (value) => {
			return <Link>{value}</Link>
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
			<Box flex="1" style={{
				position: 'relative'
			}}>
				{Boolean(tail) && tail.length > 0 && (<Table rowKey="id" data={tail} columns={COLUMNS} onRowClick={({
					id
				}) => {
					return this.openChannel(_.find(this.props.tail, {
						id
					}))
				}}/>)}
				{Boolean(tail) && tail.length === 0 &&
            <Txt.p p={3}>No results found</Txt.p>}
			</Box>

			{Boolean(this.props.type) && (
				<React.Fragment>
					<Flex
						p={3}
						style={{
							borderTop: '1px solid #eee'
						}}
						justify="flex-end"
					>
						<Button
							success={true}
							onClick={this.openCreateChannel}
						>
							Add {this.props.type.name || this.props.type.slug}
						</Button>
					</Flex>
				</React.Fragment>
			)}
		</Column>)
	}
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addChannel: bindActionCreators(actionCreators.addChannel, dispatch)
		}
	}
}

const lens = {
	slug: 'lens-support-issue-table',
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CardTable),
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

export default lens
