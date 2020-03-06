/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as React from 'react'
import {
	Box,
	Button,
	Txt,
	Badge
} from 'rendition'
import styled from 'styled-components'
import SelectWrapper from './SelectWrapper'
import BaseLens from '../../common/BaseLens'
import Link from '../../../../../lib/ui-components/Link'
import ColorHashPill from '../../../../../lib/ui-components/shame/ColorHashPill'
import {
	appendToChannelPath
} from '../../../../../lib/ui-components/services/helpers.js'
import {
	formatCurrency,
	formatDateLocal
} from '../../../../../lib/ui-components/services/formatters'
import CardTable from '../Table/CardTable'

const SingleLineSpan = styled.span `
	whiteSpace: 'nowrap'
`
class CRMTable extends BaseLens {
	constructor (props) {
		super(props)
		this.columns = this.initColumns()
		this.generateTableData = this.generateTableData.bind(this)
	}

	initColumns () {
		return [
			{
				field: 'Opportunity',
				sortable: true,
				render: (value, item) => {
					return <Link to={appendToChannelPath(this.props.channel, item)}>{value}</Link>
				}
			},
			{
				field: 'Account',
				sortable: true,
				render: (account, item) => {
					if (!account) {
						return (
							<Button
								mr={2}
								success

								// TODO: This should open a linked account create modal
								onClick={this.openCreateChannel}
							>
					Add new linked Account
							</Button>
						)
					}

					return (
						<Box>
							<Link to={appendToChannelPath(this.props.channel, account)}>{account.name}</Link>
							<Txt color="text.light" fontSize="0">{_.get(account, [ 'data', 'type' ])}</Txt>
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
				field: 'Stage',
				sortable: true,
				render: (value, item) => <SelectWrapper {...this.props} card={value} />
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
						return <ColorHashPill key={index} value={value} mr={2} mb={1} color={'white'} />
					})
				}
			}
		]
	}

	generateTableData () {
		return this.props.tail ? _.map(this.props.tail, (opportunity) => {
			const account = _.find(_.get(opportunity, [ 'links', 'is attached to' ]))

			const update = _.find(_.get(opportunity, [ 'links', 'has attached element' ]), (linkedCard) => {
				return [ 'update', 'update@1.0.0' ].includes(linkedCard.type)
			})

			return {
				id: opportunity.id,
				slug: _.get(opportunity, [ 'slug' ]),

				Opportunity: _.get(opportunity, [ 'name' ]),
				Account: account,
				'Due Date': _.get(opportunity, [ 'data', 'dueDate' ]),
				Value: _.get(opportunity, [ 'data', 'value' ]),
				'Estimated ARR': _.get(opportunity, [ 'data', 'arr' ]),
				Stage: opportunity,
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
		return (
			<CardTable
				{...this.props}
				rowKey="slug"
				generateData={this.generateTableData}
				columns={this.columns}
			/>
		)
	}
}

export default CRMTable
