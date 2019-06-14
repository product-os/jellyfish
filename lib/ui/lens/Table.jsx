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
	Box,
	Button,
	Flex,
	Table,
	Txt
} from 'rendition'
import BaseLens from './common/BaseLens'
import Link from '../components/Link'
import {
	selectors
} from '../core'
import Column from '../shame/Column'

const COLUMNS = [
	{
		field: 'name',
		sortable: true,
		render: (value, item) => {
			return <Link append={item.slug || item.id}>{value}</Link>
		}
	},
	{
		field: 'Created',
		sortable: true
	},
	{
		field: 'Last updated',
		sortable: true
	}
]

class CardTable extends BaseLens {
	render () {
		const tail = this.props.tail ? _.map(this.props.tail, (card) => {
			const update = _.find(_.get(card, [ 'links', 'has attached element' ]), {
				type: 'update'
			})
			return {
				name: card.name,
				id: card.id,
				slug: card.slug,
				Created: card.created_at,
				'Last updated': _.get(update, [ 'data', 'timestamp' ], null)
			}
		}) : null

		return (
			<Column overflowY flex="1">
				<Box flex="1" style={{
					position: 'relative'
				}}>
					{Boolean(tail) && tail.length > 0 && (
						<Table
							rowKey="id"
							data={tail}
							columns={COLUMNS}
						/>
					)}
					{Boolean(tail) && tail.length === 0 &&
							<Txt.p p={3}>No results found</Txt.p>}
				</Box>

				{Boolean(this.props.type) &&
					<React.Fragment>
						<Flex
							p={3}
							style={{
								borderTop: '1px solid #eee'
							}}
							justifyContent="flex-end"
						>
							<Button
								success
								onClick={this.openCreateChannel}
							>
								Add {this.props.type.name || this.props.type.slug}
							</Button>
						</Flex>
					</React.Fragment>
				}
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state)
	}
}

const lens = {
	slug: 'lens-table',
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(mapStateToProps)(CardTable),
		icon: 'table',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}
}

export default lens
