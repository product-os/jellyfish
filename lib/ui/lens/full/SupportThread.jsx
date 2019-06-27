/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
import clone from 'deep-copy'
import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Button,
	DropDownButton,
	Flex,
	Link,
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import CardFields from '../../components/CardFields'
import Event from '../../components/Event'
import RouterLink from '../../components/Link'
import {
	Tag
} from '../../components/Tag'
import {
	actionCreators,
	selectors,
	sdk
} from '../../core'
import * as helpers from '../../services/helpers'
import Timeline from '../list/Timeline'
import CardLayout from '../../layouts/CardLayout'
import ColorHashPill from '../../shame/ColorHashPill'
import Icon from '../../shame/Icon'

const Extract = styled(Box) `
	background: lightyellow;
	border-top: 1px solid ${Theme.colors.gray.light};
	border-bottom: 1px solid ${Theme.colors.gray.light};
`
const getHighlights = (card) => {
	const list = _.sortBy(_.filter(_.get(card, [ 'links', 'has attached element' ]), (event) => {
		if (!_.includes([ 'message', 'whisper' ], event.type)) {
			return false
		}
		const message = _.get(event, [ 'data', 'payload', 'message' ])
		return Boolean(message) && Boolean(message.match(/(#summary|#status)/gi))
	}), 'data.timestamp')
	return _.uniqBy(list, (item) => {
		return _.get(item, [ 'data', 'payload', 'message' ])
	})
}

class SupportThreadBase extends React.Component {
	constructor (props) {
		super(props)

		this.close = () => {
			this.setState({
				isClosing: true
			})

			sdk.card.update(this.props.card.id, _.merge({}, this.props.card, {
				data: {
					status: 'closed'
				}
			}))
				.then(() => {
					this.props.actions.addNotification('success', 'Closed support thread')
					this.props.actions.removeChannel(this.props.channel)
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
					this.setState({
						isClosing: false
					})
				})
		}

		this.handleExpandToggle = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}

		this.toggleHighlights = () => {
			this.setState({
				showHighlights: !this.state.showHighlights
			})
		}

		this.state = {
			actor: null,
			isClosing: false,
			linkedSupportIssues: [],
			linkedGitHubIssues: [],
			showHighlights: false,
			expanded: false
		}
		this.loadLinks(props.card.id)

		this.setCategory = this.setCategory.bind(this)
	}

	async componentDidMount () {
		const actor = await helpers.getCreator(this.props.actions.getActor, this.props.card)

		this.setState({
			actor
		})
	}

	setCategory (event) {
		event.preventDefault()

		const category = event.target.dataset.category

		if (category === _.get(this.props.card, [ 'data', 'category' ])) {
			return
		}

		const update = clone(this.props.card)
		_.set(update, [ 'data', 'category' ], category)

		sdk.card.update(update.id, update)
			.then(() => {
				this.props.actions.addNotification('success', `Successfully set support thread category to: ${category}`)
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error)
			})
	}

	loadLinks (id) {
		Bluebird.all([
			sdk.query({
				$$links: {
					'support thread is attached to support issue': {
						type: 'object',
						additionalProperties: true
					}
				},
				type: 'object',
				description: `Support thread by id ${id} attached to support issue`,
				properties: {
					id: {
						type: 'string',
						const: id
					},
					type: {
						type: 'string',
						const: 'support-thread'
					}
				},
				additionalProperties: true
			}),
			sdk.query({
				$$links: {
					'support thread is attached to issue': {
						type: 'object',
						additionalProperties: true
					}
				},
				type: 'object',
				description: `Support thread by id ${id} attached to issue`,
				properties: {
					id: {
						type: 'string',
						const: id
					},
					type: {
						type: 'string',
						const: 'support-thread'
					}
				},
				additionalProperties: true
			})
		])
			.then(([ supportIssueResult, issueResult ]) => {
				if (supportIssueResult.length) {
					this.setState({
						linkedSupportIssues: _.get(
							supportIssueResult[0],
							[ 'links', 'support thread is attached to support issue' ]
						)
					})
				}

				if (issueResult.length) {
					this.setState({
						linkedGitHubIssues: _.get(
							issueResult[0],
							[ 'links', 'support thread is attached to issue' ]
						)
					})
				}
			})
	}
	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextProps, this.props) || !circularDeepEqual(nextState, this.state)
	}
	componentWillUpdate (nextProps) {
		const verb1 = 'support thread is attached to support issue'
		const verb2 = 'support thread is attached to issue'
		if (
			(nextProps.card.id !== this.props.card.id) ||
			(nextProps.card.linked_at[verb1] !== this.props.card.linked_at[verb1]) ||
			(nextProps.card.linked_at[verb2] !== this.props.card.linked_at[verb2])
		) {
			this.loadLinks(nextProps.card.id)
		}
	}
	render () {
		const {
			card,
			channel,
			fieldOrder
		} = this.props
		const {
			linkedSupportIssues,
			linkedGitHubIssues
		} = this.state
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})
		const typeSchema = _.get(typeCard, [ 'data', 'schema' ])
		const defaultCategory = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'default' ])
		const categoryOptions = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'enum' ])

		const {
			actor,
			isClosing
		} = this.state

		const highlights = getHighlights(card)

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={(
					<Flex flex={1} justifyContent="space-between">
						<DropDownButton
							primary
							label={_.get(card, [ 'data', 'category' ], defaultCategory)}
							joined
						>
							{_.map(categoryOptions, (item) => {
								return (
									<Link
										data-category={item}
										key={item}
										onClick={this.setCategory}
									>
										{item}
									</Link>
								)
							})}
						</DropDownButton>

						<Button
							plain
							mr={3}
							tooltip={{
								placement: 'bottom',
								text: 'Close this support thread'
							}}
							onClick={this.close}
							icon={
								<Icon
									name={isClosing ? 'cog' : 'archive'}
									spin={isClosing}
								/>
							}
						/>
					</Flex>
				)}
				actionItems={(
					<React.Fragment>
						<RouterLink append="view-all-support-issues">
							Search support issues
						</RouterLink>

						<RouterLink append="view-all-issues">
							Search GitHub issues
						</RouterLink>
					</React.Fragment>
				)}
			>
				<Box
					px={3}
					pt={3}
				>
					<Flex alignItems="center" mb={1} wrap="true">
						<ColorHashPill value={_.get(card, [ 'data', 'inbox' ])} mr={2} mb={1} />
						<ColorHashPill value={_.get(card, [ 'data', 'status' ])} mr={2} mb={1} />

						{Boolean(card.tags) && _.map(card.tags, (tag) => {
							if (tag === 'status' || tag === 'summary' || tag === 'pendinguserresponse') {
								return null
							}
							return <Tag key={tag} mr={2} mb={1}>{tag}</Tag>
						})}

						{Boolean(linkedGitHubIssues && linkedGitHubIssues.length) && _.map(linkedGitHubIssues, (entry) => {
							return (
								<Tag key={entry.id} mr={2} mb={1} tooltip={entry.name}>
									<Icon name="github" brands />
									<Link
										ml={1}
										href={`/${entry.slug || entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-issue"
									>
										{entry.name}
									</Link>
								</Tag>
							)
						})}
					</Flex>

					{Boolean(actor) && (
						<Txt mb={1} tooltip={actor.email}>
							Conversation with <strong>{actor.name}</strong>
						</Txt>
					)}

					{Boolean(card.name) && (
						<Box mb={1}>
							<Txt bold>{card.name}</Txt>
						</Box>
					)}

					<Flex justifyContent="space-between">
						<Txt><em>Created {helpers.formatTimestamp(card.created_at)}</em></Txt>

						<Txt>
							<em>Updated {helpers.timeAgo(_.get(helpers.getLastUpdate(card), [ 'data', 'timestamp' ]))}</em>
						</Txt>
					</Flex>

					{!this.state.expanded && (
						<Link
							onClick={this.handleExpandToggle}
							mt={2}
							data-test="support-thread__expand"
						>
							More
						</Link>
					)}

					{this.state.expanded && (
						<React.Fragment>
							{highlights.length > 0 && (
								<div>
									<strong>
										<Link
											mt={1}
											onClick={this.toggleHighlights}
										>
														Highlights{' '}
											<Icon name={`caret-${this.state.showHighlights ? 'down' : 'right'}`}/>
										</Link>
									</strong>
								</div>
							)}

							{this.state.showHighlights && (
								<Extract py={2}>
									{_.map(highlights, (statusEvent) => {
										return (
											<Event
												key={statusEvent.id}
												card={statusEvent}
												user={this.props.user}
												mb={1}
											/>
										)
									})}
								</Extract>
							)}

							{Boolean(linkedSupportIssues && linkedSupportIssues.length) && (
								<Txt><strong>Linked support issues</strong></Txt>
							)}
							{_.map(linkedSupportIssues, (entry) => {
								return (
									<div>
										<Link
											mr={2}
											href={`/${entry.slug || entry.id}`}
											key={entry.id}
											data-test="support-thread__linked-support-issue"
										>
											{entry.name}
										</Link>
									</div>
								)
							})}

							<CardFields
								card={card}
								fieldOrder={fieldOrder}
								type={typeCard}
								omit={[
									'category',
									'status',
									'inbox',
									'origin',
									'environment',
									'translateDate'
								]}
							/>

							<Box>
								<Link mt={3} onClick={this.handleExpandToggle}>
									Less
								</Link>
							</Box>
						</React.Fragment>
					)}
				</Box>

				<Box flex="1" style={{
					minHeight: 0
				}}>
					<Timeline.data.renderer
						allowWhispers
						card={this.props.card}
						tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
					/>
				</Box>
			</CardLayout>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'getActor',
				'removeChannel'
			]),
			dispatch
		)
	}
}

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThreadBase),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread'
				}
			}
		}
	}
}
