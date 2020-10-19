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
	Txt,
	DropDownButton
} from 'rendition'
import {
	getPathsInSchema
} from '@balena/jellyfish-ui-components/lib/services/helpers'
import {
	ActionLink
} from '@balena/jellyfish-ui-components/lib/shame/ActionLink'
import flatten from 'flat'
import BaseLens from '../../common/BaseLens'
import Link from '@balena/jellyfish-ui-components/lib/Link'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'
import LinkModal from '../../../components/LinkModal'

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
		this.state = {
			checkedCards: [],
			showLinkModal: false
		}
		this.onChecked = this.onChecked.bind(this)
		this.showLinkModal = this.showLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.openCreateChannelForLinking = this.openCreateChannelForLinking.bind(this)
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
			showLinkModal: true
		})
	}

	hideLinkModal () {
		this.setState({
			showLinkModal: false
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
			lensSlug,
			actions,
			allTypes,
			generateData,
			columns
		} = this.props
		const {
			checkedCards,
			showLinkModal
		} = this.state
		const tableColumns = columns || this.generateTableColumns()
		const data = generateData ? generateData() : this.generateTableData()

		return (
			<Column overflowY flex="1" data-test={`lens--${lensSlug}`}>
				<Box flex="1" style={{
					position: 'relative'
				}}>
					{showLinkModal && (
						<LinkModal
							actions={actions}
							cards={checkedCards}
							types={allTypes}
							onHide={this.hideLinkModal}
						/>
					)}
					{Boolean(data) && data.length > 0 && (
						<React.Fragment>
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
							</DropDownButton>
							<Table
								rowKey={this.props.rowKey}
								data={data}
								columns={tableColumns}
								usePager={true}
								itemsPerPage={PAGE_SIZE}
								pagerPosition="bottom"
								data-test="table-component"
								onPageChange={this.props.setPage}
								onCheck={this.onChecked}
							/>
						</React.Fragment>
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
