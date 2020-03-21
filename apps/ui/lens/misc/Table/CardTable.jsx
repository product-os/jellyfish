/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex,
	Table,
	Txt
} from 'rendition'
import BaseLens from '../../common/BaseLens'
import Link from '../../../../../lib/ui-components/Link'
import Column from '../../../../../lib/ui-components/shame/Column'

const PAGE_SIZE = 25
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

export default class CardTable extends BaseLens {
	constructor (props) {
		super(props)
		this.generateTableData = this.generateTableData.bind(this)
	}

	generateTableData () {
		return this.props.tail ? _.map(this.props.tail, (card) => {
			const update = _.find(_.get(card, [ 'links', 'has attached element' ]), (linkedCard) => {
				return [ 'update', 'update@1.0.0' ].includes(linkedCard.type)
			})
			return {
				name: card.name,
				id: card.id,
				slug: card.slug,
				Created: card.created_at,
				'Last updated': _.get(update, [ 'data', 'timestamp' ], null)
			}
		}) : null
	}

	render () {
		const {
			generateData,
			columns
		} = this.props
		const data = generateData ? generateData() : this.generateTableData()
		return (
			<Column overflowY flex="1">
				<Box flex="1" style={{
					position: 'relative'
				}}>
					{Boolean(data) && data.length > 0 && (
						<Table
							rowKey={this.props.rowKey}
							data={data}
							columns={columns}
							usePager={true}
							itemsPerPage={PAGE_SIZE}
							pagerPosition={'both'}
							data-test="table-component"
							onPageChange={this.props.setPage}
						/>
					)}
					{Boolean(data) && data.length === 0 &&
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
								className={`btn--add-${this.props.type.slug}`}
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

CardTable.defaultProps = {
	rowKey: 'id',
	columns: COLUMNS
}
