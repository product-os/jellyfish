/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React, {
	Component
} from 'react'
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
	Table,
	Txt,
	Select,
	Badge
} from 'rendition'
import BaseLens from '../../common/BaseLens'
import Link from '../../../../../lib/ui-components/Link'
import {
	actionCreators,
	selectors,
	analytics,
	sdk
} from '../../../core'
import Column from '../../../../../lib/ui-components/shame/Column'
import ColorHashPill from '../../../../../lib/ui-components/shame/ColorHashPill'
import {
	appendToChannelPath,
	patchPath
} from '../../../../../lib/ui-components/services/helpers.js'

class DropDownButtonWrapper extends Component {
	// eslint-disable-next-line class-methods-use-this
	setValue (newValue, card) {
		const patch = patchPath(card, [ 'data', 'status' ], newValue)
		const id = card.id
		const type = card.type
		const {
			actions
		} = this.props

		if (patch.length) {
			sdk.card.update(id, type, patch)
				.then(() => {
					analytics.track('element.update', {
						element: {
							id,
							type
						}
					})
				})
				.then(() => {
					console.log(`Updated ${card.name} to ${newValue}`)
					actions.addNotification('success', `Updated ${card.name} to ${newValue}`)
				})
				.catch((error) => {
					console.log(error, error.message)
					actions.addNotification('danger', error.message || error)
				})
		}
	}

	render () {
		const {
			card,
			types
		} = this.props

		const label = _.get(card, [ 'data', 'status' ])
		return (
			<Select
				options={types}
				onChange={({
					option
				}) => this.setValue(option, card)}
				value={
					<span style={{
						whiteSpace: 'nowrap'
					}}>
						<Badge shade={types.indexOf(label)} xsmall m={1}>{label}</Badge>
					</span>
				}
			>
				{(option, index) => <Badge shade={index} xsmall m={1}>{option}</Badge>}
			</Select>
		)
	}
}

// Class dropbodown button status
export class BetterTable extends BaseLens {
	constructor (props) {
		super(props)

		this.state = {
			COLUMNS: [
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
					render: (account) => {
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
						const date = Date.parse(value)
						const due = new Date(date).valueOf() <= new Date(Date.now()).valueOf()
						const formattedDate = new Intl.DateTimeFormat().format(date)

						if (value && due) {
							return (
								<span style={{
									whiteSpace: 'nowrap'
								}}>
									<Badge xsmall shade={5}>
										{`Due: ${formattedDate}`}
									</Badge>
								</span>
							)
						}

						const noWrapBadge = (
							<span style={{
								whiteSpace: 'nowrap'
							}}>
								<Badge xsmall shade={11}>
									{formattedDate}
								</Badge>
							</span>
						)

						return value ? noWrapBadge : ''
					}
				},
				{
					field: 'Value',
					sortable: true,
					render: (value) => {
						if (!value) return ''
						return new Intl.NumberFormat('en-US', {
							style: 'currency', currency: 'USD', minimumFractionDigits: 0
						}).format(value)
					}
				},
				{
					field: 'Estimated ARR',
					sortable: true,
					render: (value) => {
						if (!value) return ''
						return new Intl.NumberFormat('en-US', {
							style: 'currency', currency: 'USD', minimumFractionDigits: 0
						}).format(value)
					}
				},
				{
					field: 'Stage',
					sortable: true,
					render: (value, item) => <DropDownButtonWrapper {...props} card={value} />
				},
				{
					field: 'Account Status',
					sortable: true,
					render: (value) => {
						return (
							<span style={{
								whiteSpace: 'nowrap'
							}}>
								{value}
							</span>
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
	}

	render () {
		const {
			COLUMNS
		} = this.state

		const tail = this.props.tail ? _.map(this.props.tail, (opportunity) => {
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

		return (
			<Column overflowY flex="1">
				<Box flex="1" style={{
					position: 'relative'
				}}>
					{Boolean(tail) && tail.length > 0 && (
						<Table
							rowKey="slug"
							data={tail}
							columns={COLUMNS}
							usePager={tail.length >= 30}
							itemsPerPage={30}
							pagerPosition={'both'}
						/>)}
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

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),

		// Types: selectors.getTypes(state)
		types: _.get(
			_.find(selectors.getTypes(state), [ 'slug', 'opportunity' ]), [
				'data',
				'schema',
				'properties',
				'data',
				'properties',
				'status',
				'enum'
			]
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-better-table',
	type: 'lens',
	version: '1.0.0',
	name: 'Better table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(BetterTable),
		format: 'full',
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
