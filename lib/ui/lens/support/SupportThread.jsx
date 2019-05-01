/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
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
	DropDownButton,
	Flex,
	Link,
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import {
	CardActions
} from '../../components/CardActions'
import CardField from '../../components/CardField'
import Event from '../../components/Event'
import Label from '../../components/Label'
import {
	Tag
} from '../../components/Tag'
import {
	actionCreators,
	selectors,
	sdk
} from '../../core'
import * as helpers from '../../services/helpers'
import Timeline from '../Timeline'
import {
	ActionLink
} from '../../shame/ActionLink'
import {
	CloseButton
} from '../../shame/CloseButton'
import ColorHashPill from '../../shame/ColorHashPill'
import Column from '../../shame/Column'
import Icon from '../../shame/Icon'
import {
	IconButton
} from '../../shame/IconButton'

const {
	getCreator,
	getLastUpdate
} = require('./utils')

const Extract = styled(Box) `
	background: lightyellow;
	border-top: 1px solid ${Theme.colors.gray.light};
	border-bottom: 1px solid ${Theme.colors.gray.light};
`
const transformMirror = (mirror) => {
	if (mirror.includes('frontapp.com')) {
		const id = mirror.split('/').pop()
		return `https://app.frontapp.com/open/${id}`
	}
	return mirror
}

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
			sdk.card.update(this.props.card.id, _.merge({}, this.props.card, {
				data: {
					status: 'closed'
				}
			}))
				.then(() => {
					this.props.actions.addNotification('success', 'Closed this support thread')
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.handleExpandToggle = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}
		this.state = {
			linkedSupportIssues: [],
			linkedGitHubIssues: [],
			showHighlights: false,
			expanded: false
		}
		this.loadLinks(props.card.id)

		this.setCategory = this.setCategory.bind(this)
		this.openSupportIssueView = this.openSupportIssueView.bind(this)
		this.openGitHubIssueView = this.openGitHubIssueView.bind(this)
	}

	openSupportIssueView () {
		this.props.actions.addChannel({
			target: 'view-all-support-issues',
			cardType: 'view',
			parentChannel: this.props.channel.id
		})
	}

	openGitHubIssueView () {
		this.props.actions.addChannel({
			target: 'view-all-issues',
			cardType: 'view',
			parentChannel: this.props.channel.id
		})
	}

	setCategory (event) {
		event.preventDefault()

		const category = event.target.dataset.category

		if (category === _.get(this.props.card, [ 'data', 'category' ])) {
			return
		}

		const update = _.cloneDeep(this.props.card)
		_.set(update, [ 'data', 'category' ], category)

		sdk.card.update(update.id, update)
			.then(() => {
				this.props.actions.addNotification('success', `Successfully set support thread category to: ${category}`)
				this.props.actions.removeChannel(this.props.channel)
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
			card, fieldOrder
		} = this.props
		const {
			linkedSupportIssues,
			linkedGitHubIssues
		} = this.state
		const payload = card.data
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})
		const typeSchema = _.get(typeCard, [ 'data', 'schema' ])
		const localSchema = helpers.getLocalSchema(card)
		const defaultCategory = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'default' ])
		const categoryOptions = _.get(typeSchema, [ 'properties', 'data', 'properties', 'category', 'enum' ])

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({}, {
			type: 'object',
			properties: {
				data: localSchema
			}
		}, typeSchema)
		const unorderedKeys = _.filter(_.keys(payload), (key) => {
			return !_.includes(fieldOrder, key)
		})

		// Omit the category, status and inbox fields as they are rendered seperately, also
		// omit some fields that are used by the sync functionality
		const keys = _.without((fieldOrder || []).concat(unorderedKeys),
			'category',
			'status',
			'inbox',
			'origin',
			'environment',
			'translateDate'
		)
		const actor = getCreator(card)
		const highlights = getHighlights(card)
		return (
			<Column
				flex={this.props.flex}
				data-test-component="column"
				data-test-id={card.id}
				overflowY
			>
				<Box
					px={3}
					pt={3}
				>
					<Flex mb={2} justify="space-between">
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

						<Flex align="center">
							<IconButton plaintext square mr={1} tooltip={{
								placement: 'bottom',
								text: 'Close this support thread'
							}} onClick={this.close}>
								<Icon name="archive"/>
							</IconButton>

							<CardActions card={card}>
								<ActionLink onClick={this.openSupportIssueView}>
									Search support issues
								</ActionLink>

								<ActionLink onClick={this.openGitHubIssueView}>
									Search GitHub issues
								</ActionLink>
							</CardActions>

							<CloseButton
								mr={-3}
								onClick={() => {
									return this.props.actions.removeChannel(this.props.channel)
								}}
							/>
						</Flex>
					</Flex>

					<Flex align="center" mb={1} wrap>
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
										href={`/#issue~${entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-issue"
									>
										{entry.name}
									</Link>
								</Tag>
							)
						})}
					</Flex>

					<Txt mb={1} tooltip={actor.email}>
						Conversation with <strong>{actor.name}</strong>
					</Txt>

					{Boolean(card.name) && (
						<Box mb={1}>
							<Txt bold>{card.name}</Txt>
						</Box>
					)}

					<Flex justify="space-between">
						<Txt><em>Created {helpers.formatTimestamp(card.created_at)}</em></Txt>

						<Txt>
							<em>Updated {helpers.timeAgo(_.get(getLastUpdate(card), [ 'data', 'timestamp' ]))}</em>
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
							{highlights.length > 0 && (<div>
								<strong>
									<Link mt={1} onClick={() => {
										return this.setState({
											showHighlights: !this.state.showHighlights
										})
									}}>
													Highlights{' '}
										<Icon name={`caret-${this.state.showHighlights ? 'down' : 'right'}`}/>
									</Link>
								</strong>
							</div>)}

							{this.state.showHighlights && (<Extract py={2}>
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
							</Extract>)}

							{Boolean(linkedSupportIssues && linkedSupportIssues.length) && (
								<Txt><strong>Linked support issues</strong></Txt>
							)}
							{_.map(linkedSupportIssues, (entry) => {
								return (
									<div>
										<Link
											mr={2}
											href={`/#support-issue~${entry.id}`}
											key={entry.id}
											data-test="support-thread__linked-support-issue"
										>
											{entry.name}
										</Link>
									</div>
								)
							})}

							{_.map(keys, (key) => {
								if (key === 'mirrors' && payload[key]) {
									return (
										<React.Fragment key={key}>
											<Label.default my={3}>{key}</Label.default>
											{payload[key].map((mirror) => {
												const url = transformMirror(mirror)
												return <Link key={url} blank href={url}>{url}</Link>
											})}
										</React.Fragment>
									)
								}

								return payload[key]
									? <CardField
										key={key}
										field={key}
										payload={payload}
										users={this.props.allUsers}
										schema={_.get(schema, [ 'properties', 'data', 'properties', key ])}
									/>
									: null
							})}

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
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		allUsers: selectors.getAllUsers(state),
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification',
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
