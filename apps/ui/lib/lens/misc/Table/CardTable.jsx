/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import skhema from 'skhema'
import {
	Box,
	Flex,
	Table,
	DropDownButton,
	TextWithCopy
} from 'rendition'
import {
	ActionLink,
	Column,
	helpers,
	Link
} from '@balena/jellyfish-ui-components'
import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import flatten from 'flat'
import {
	LinkModal,
	UnlinkModal
} from '../../../components/LinkModal'
import {
	ColumnHider
} from './ColumnHider'

const PAGE_SIZE = 25

// For some columns like card.name we use a render function
const RENDERERS = {
	name: (name, item) => {
		return <Link append={item.slug || item.id}>{name || 'click to view'}</Link>
	},
	id: (id) => {
		return (
			<TextWithCopy monospace showCopyButton="always" copy={id}>{id.slice(0, 7)}</TextWithCopy>
		)
	},
	slug: (slug, item) => {
		return <Link append={item.slug || item.id}>{slug}</Link>
	},
	created_at: (timestamp, item) => {
		return format(parseISO(timestamp), 'MM/dd/yyyy hh:mm:ss')
	},
	updated_at: (timestamp, item) => {
		return timestamp ? format(parseISO(timestamp), 'MM/dd/yyyy hh:mm:ss') : null
	}
}

// Do not include markdown or mermaid fields in our table
const OMISSIONS = [
	{
		key: 'format',
		value: 'markdown'
	},
	{
		key: 'format',
		value: 'mermaid'
	}
]

export default class CardTable extends React.Component {
	constructor (props) {
		super(props)
		this.generateTableData = this.generateTableData.bind(this)
		this.generateTableColumns = this.generateTableColumns.bind(this)
		this.state = {
			checkedCards: [],
			showLinkModal: null,
			tableColumns: props.columns || this.generateTableColumns()
		}
		this.onChecked = this.onChecked.bind(this)
		this.showLinkModal = this.showLinkModal.bind(this)
		this.showUnlinkModal = this.showUnlinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.toggleColumns = this.toggleColumns.bind(this)
		this.openCreateChannel = this.openCreateChannel.bind(this)
		this.openCreateChannelForLinking = this.openCreateChannelForLinking.bind(this)
	}

	openCreateChannel () {
		const {
			type,
			actions,
			channel: {
				data: {
					head
				}
			}
		} = this.props
		actions.openCreateChannel(head, type)
	}

	onChecked (checkedRows) {
		const {
			tail
		} = this.props
		this.setState({
			checkedCards: checkedRows.map(({
				slug
			}) => {
				return _.find(tail, {
					slug
				})
			})
		})
	}

	showLinkModal () {
		this.setState({
			showLinkModal: 'link'
		})
	}

	showUnlinkModal () {
		this.setState({
			showLinkModal: 'unlink'
		})
	}

	hideLinkModal () {
		this.setState({
			showLinkModal: null
		})
	}

	openCreateChannelForLinking () {
		const {
			checkedCards
		} = this.state
		this.props.actions.addChannel({
			head: {
				seed: {
					markers: this.props.channel.data.head.markers
				},
				onDone: {
					action: 'link',
					targets: checkedCards
				}
			},
			format: 'create',
			canonical: false
		})
	}

	toggleColumns (items, active = null) {
		const targetColumnFields = _.map(_.castArray(items), 'field')

		const tableColumns = _.map(this.state.tableColumns, (column) => {
			if (_.includes(targetColumnFields, column.field)) {
				if (active === null) {
					column.active = !column.active
				} else {
					column.active = active
				}
			}
			return column
		})

		// Set lens state action here
		const target = _.get(this.props, [ 'channel', 'data', 'head', 'id' ])
		this.props.actions.setLensState(this.props.SLUG, target, {
			columns: tableColumns.map((column) => {
				return _.pick(column, [ 'field', 'active' ])
			})
		})

		this.setState({
			tableColumns
		})
	}

	generateTableColumns () {
		const {
			allTypes,
			lensState,
			tailTypes
		} = this.props

		const typesSchemas = _.map(tailTypes, 'data.schema', {})

		const baseCardSchema = _.find(allTypes, {
			slug: 'card'
		}).data.schema

		// Select the "default" schema cards from the "card" definition, as they may
		// not be explicitly defined on the specified type card
		const defaultSchema = _.pick(baseCardSchema, [
			'properties.name',
			'properties.id',
			'properties.slug',
			'properties.created_at',
			'properties.updated_at'
		])

		const paths = helpers.getPathsInSchema(skhema.merge([ defaultSchema, ...typesSchemas ]), OMISSIONS)

		return _.map(paths, ({
			title, path
		}) => {
			const field = _.join(path, '.')
			const render = RENDERERS[field]
			return {
				label: title,
				field,
				sortable: true,
				render,
				active: _.get(_.find(lensState.columns, {
					field
				}), [ 'active' ], true)
			}
		})
	}

	generateTableData () {
		return _.map(this.props.tail, flatten)
	}

	render () {
		const {
			allTypes,
			generateData
		} = this.props
		const {
			checkedCards,
			showLinkModal,
			tableColumns
		} = this.state
		const data = generateData ? generateData() : this.generateTableData()

		return (
			<Column overflowY flex="1">
				<Box flex="1" style={{
					position: 'relative'
				}}>
					{showLinkModal === 'link' && (
						<LinkModal
							cards={checkedCards}
							types={allTypes}
							onHide={this.hideLinkModal}
						/>
					)}

					{showLinkModal === 'unlink' && (
						<UnlinkModal
							cards={checkedCards}
							onHide={this.hideLinkModal}
						/>
					)}

					{Boolean(data) && data.length > 0 && (
						<React.Fragment>
							<Flex>
								<DropDownButton
									data-test="cardTableActions__dropdown"
									m={2}
									joined
									label={`With ${checkedCards.length} selected`}
									disabled={!checkedCards.length}
								>
									<ActionLink
										data-test="cardTableActions__link-existing"
										onClick={this.showLinkModal}
									>
										Link to existing element
									</ActionLink>
									<ActionLink
										data-test="cardTableActions__link-new"
										onClick={this.openCreateChannelForLinking}
									>
										Create a new element to link to
									</ActionLink>
									<ActionLink
										data-test="cardTableActions__unlink-existing"
										onClick={this.showUnlinkModal}
									>
										Unlink from existing element
									</ActionLink>
								</DropDownButton>

								<ColumnHider
									toggleColumns={this.toggleColumns}
									tableColumns={tableColumns}
								/>
							</Flex>

							<Table
								rowKey={this.props.rowKey}
								data={data}
								columns={_.filter(tableColumns, {
									active: true
								})}
								usePager={true}
								itemsPerPage={PAGE_SIZE}
								pagerPosition="bottom"
								data-test="table-component"
								onPageChange={this.props.setPage}
								onCheck={this.onChecked}
							/>
						</React.Fragment>
					)}
				</Box>
			</Column>
		)
	}
}

CardTable.defaultProps = {
	rowKey: 'id'
}
