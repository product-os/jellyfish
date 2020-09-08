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
import {
	getPathsInSchema
} from '@balena/jellyfish-ui-components/lib/services/helpers'
import flatten from 'flat'
import BaseLens from '../../common/BaseLens'
import Link from '@balena/jellyfish-ui-components/lib/Link'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'

const PAGE_SIZE = 25

// For some columns like card.name we use a render function
const RENDERERS = {
	name: (name, item) => {
		return <Link append={item.slug || item.id}>{name}</Link>
	}
}

// Do not include markdown or mermaid fields in our table,
// as well as the id and slug fields
const OMISSIONS = [ {
	field: 'id'
}, {
	field: 'slug'
},
{
	key: 'format',
	value: 'markdown'
}, {
	key: 'format',
	value: 'mermaid'
} ]

export default class CardTable extends BaseLens {
	constructor (props) {
		super(props)
		this.generateTableData = this.generateTableData.bind(this)
		this.generateTableColumns = this.generateTableColumns.bind(this)
	}

	generateTableColumns () {
		const {
			type: {
				data: {
					schema
				}
			}
		} = this.props

		const paths = getPathsInSchema(schema, OMISSIONS)

		return _.map(paths, ({
			title, path
		}) => {
			const field = _.join(path, '.')
			const render = RENDERERS[field]
			return {
				label: title,
				field,
				sortable: true,
				render
			}
		})
	}

	generateTableData () {
		return this.props.tail
			? _.map(this.props.tail, (card) => {
				const update = _.find(
					_.get(card, [ 'links', 'has attached element' ]),
					(linkedCard) => {
						return [ 'update', 'update@1.0.0' ].includes(linkedCard.type)
					}
				)

				// First we pick out the useful data
				const pickedData = _.pick(card, [
					'name',
					'id',
					'slug',
					'created_at',
					'data'
				])

				return {
					...flatten(pickedData),
					'Last updated': _.get(update, [ 'data', 'timestamp' ], null)
				}
			})
			: null
	}

	render () {
		const {
			generateData,
			columns
		} = this.props
		const tableColumns = columns || this.generateTableColumns()
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
							columns={tableColumns}
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
	rowKey: 'id'
}
