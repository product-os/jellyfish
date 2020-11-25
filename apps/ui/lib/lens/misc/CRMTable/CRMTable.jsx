/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	ColorHashPill,
	formatCurrency,
	formatDateLocal,
	helpers,
	Link
} from '@balena/jellyfish-ui-components'
import _ from 'lodash'
import * as React from 'react'
import {
	Badge, Box,
	Txt
} from 'rendition'
import CardOwner from '../../../components/CardOwner'
import {
	FLOW_IDS
} from '../../../components/Flows/flow-utils'
import LinkModal from '../../../components/LinkModal'
import LensLayout from '../../../layouts/LensLayout'
import BaseLens from '../../common/BaseLens'
import CardTable from '../Table/CardTable'
import {
	SingleLineSpan
} from './helpers'
import InlineLinkButton from './InlineLinkButton'
import SelectWrapper from './SelectWrapper'

class CRMTable extends BaseLens {
	constructor (props) {
		super(props)
		this.columns = this.initColumns()
		this.showLinkModal = this.showLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.generateTableData = this.generateTableData.bind(this)
		this.state = {
			showLinkModal: false
		}
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

	initColumns () {
		return [
			{
				field: 'Opportunity',
				sortable: true,
				render: (value, item) => {
					return <Link to={helpers.appendToChannelPath(this.props.channel, item)}>{value}</Link>
				}
			},
			{
				field: 'Account',
				sortable: true,
				render: ({
					accounts, opportunity
				}) => {
					const {
						actions,
						types
					} = this.props

					if (!accounts) {
						const selectedCardTypes = types.filter((typeCard) => {
							return typeCard.slug.includes('account')
						})

						return (
							<InlineLinkButton mr={2} card={opportunity} actions={actions} types={selectedCardTypes} />
						)
					}

					const linkedCardsCount = _.get(opportunity, [ 'links', 'is attached to' ]).length - 1
					const account = _.find(accounts)
					const typeName = linkedCardsCount >= 2 ? `${account.type.split('@')[0]}s` : account.type.split('@')[0]

					return (
						<Box minWidth={200}>
							<Link to={helpers.appendToChannelPath(this.props.channel, account)}>{account.name}</Link>
							<Txt color="text.light" fontSize="0">{_.get(account, [ 'data', 'type' ])}</Txt>
							{Boolean(linkedCardsCount) && (
								<Txt color="text.light" fontSize="0">{`+${linkedCardsCount} linked ${typeName}`}</Txt>
							)}
						</Box>
					)
				}
			},
			{
				field: 'Due Date',
				sortable: true,
				render: (value, item) => {
					if (!value) return ''
					const date = Date.parse(value)
					const due = new Date(date).valueOf() <= new Date(Date.now()).valueOf()
					const formattedDate = formatDateLocal(date)

					if (value && due) {
						return (
							<SingleLineSpan>
								<Badge data-test="due-date" xsmall shade={5}>
									{`Due: ${formattedDate}`}
								</Badge>
							</SingleLineSpan>
						)
					}

					const noWrapBadge = (
						<SingleLineSpan>
							<Badge data-test="due-date" xsmall shade={11}>
								{formattedDate}
							</Badge>
						</SingleLineSpan>
					)

					return value ? noWrapBadge : ''
				}
			},
			{
				field: 'Value',
				sortable: true,
				render: (value) => {
					return formatCurrency(value)
				}
			},
			{
				field: 'Estimated ARR',
				sortable: true,
				render: (value) => {
					return formatCurrency(value)
				}
			},
			{
				field: 'Status',
				sortable: true,
				render: (card, item) => <SelectWrapper {...this.props} card={card} />
			},
			{
				field: 'Owner',
				sortable: true,
				render: (card) => {
					const {
						sdk,
						actions,
						user,
						types,
						channel
					} = this.props

					const owner = _.head(_.get(card, [ 'links', 'is owned by' ], null))

					return (
						<Box minWidth={200}>
							<CardOwner
								user={user}
								types={types}
								card={card}
								channel={channel}
								sdk={sdk}
								cardOwner={owner}
								actions={actions} />
						</Box>
					)
				}
			},
			{
				field: 'Account Status',
				sortable: true,
				render: (value) => {
					return (
						<SingleLineSpan>
							{value}
						</SingleLineSpan>
					)
				}
			},
			{
				field: 'Usecase',
				sortable: true
			},
			{
				field: 'Account Industry',
				sortable: true
			},
			{
				field: 'Account Location',
				sortable: true
			},
			{
				field: 'Tags',
				sortable: true,
				render: (tags, item) => {
					if (!tags) return ''
					return tags.map((value, index) => {
						return <ColorHashPill key={index} value={value} mr={2} mb={1} />
					})
				}
			}
		].map((column) => {
			// Default all columns to active, unless there is stored state
			column.active = _.get(_.find(this.props.lensState.columns, {
				field: column.field
			}), [ 'active' ], true)
			return column
		})
	}

	generateTableData () {
		return this.props.tail ? _.map(this.props.tail, (opportunity) => {
			const accounts = _.get(opportunity, [ 'links', 'is attached to' ])
			const account = _.first(accounts)

			const update = _.find(_.get(opportunity, [ 'links', 'has attached element' ]), (linkedCard) => {
				return [ 'update', 'update@1.0.0' ].includes(linkedCard.type)
			})

			return {
				id: opportunity.id,
				slug: _.get(opportunity, [ 'slug' ]),

				Opportunity: _.get(opportunity, [ 'name' ]),
				Account: {
					accounts, opportunity
				},
				'Due Date': _.get(opportunity, [ 'data', 'dueDate' ]),
				Value: _.get(opportunity, [ 'data', 'value' ]),
				'Estimated ARR': _.get(opportunity, [ 'data', 'totalValue' ]),
				Status: opportunity,
				Owner: opportunity,
				'Account Status': _.get(account, [ 'data', 'status' ]),
				Usecase: _.get(opportunity, [ 'data', 'usecase' ]),
				'Device Type': opportunity.data.device,
				'Account Usecase': _.get(account, [ 'data', 'usecase' ]),
				'Account Industry': _.get(account, [ 'data', 'industry' ]),
				'Account Location': _.get(account, [ 'data', 'location' ]),
				Tags: _.get(opportunity, [ 'tags' ]),

				'Last updated': _.get(update, [ 'data', 'timestamp' ], null)
			}
		}) : null
	}

	render () {
		const {
			user,
			channel,
			tail,
			actions,
			types
		} = this.props
		const {
			checkedCards,
			showLinkModal
		} = this.state

		return (
			<LensLayout
				tail={tail}
				user={user}
				channel={channel}
				flowId={FLOW_IDS.GUIDED_HANDOVER}
			>
				<CardTable
					{...this.props}
					rowKey="slug"
					generateData={this.generateTableData}
					columns={this.columns}
				/>
				{showLinkModal && (
					<LinkModal
						actions={actions}
						cards={checkedCards}
						types={types}
						onHide={this.hideLinkModal}
					/>
				)}
			</LensLayout>
		)
	}
}

export default CRMTable
