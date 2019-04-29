/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const uuid = require('uuid/v4')
const Event = require('../components/Event').default
const {
	actionCreators,
	analytics,
	sdk,
	selectors
} = require('../core')
const helpers = require('../services/helpers')
const AutocompleteTextarea = require('../shame/AutocompleteTextarea')
const Icon = require('../shame/Icon')
const Column = require('../shame/Column').default

class TimelineRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.shouldScroll = true
		this.handleNewMessageChange = (event) => {
			this.setState({
				newMessage: event.target.value
			})
		}
		this.handleNewMessageSubmit = (event) => {
			this.addMessage(event)
		}
		this.handleEventToggle = () => {
			this.setState({
				messagesOnly: !this.state.messagesOnly
			})
		}
		this.handleUploadButtonClick = () => {
			const element = this.fileInputElement
			if (element) {
				element.click()
			}
		}
		this.handleFileChange = (event) => {
			const file = _.first(event.target.files)
			const message = {
				target: this.props.card,
				tags: [],
				type: 'message',
				payload: {
					file
				}
			}
			sdk.event.create(message)
				.then(() => {
					analytics.track('element.create', {
						element: {
							type: 'message'
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			pendingMessages: []
		}

		this.handleCardVisible = this.handleCardVisible.bind(this)
	}
	componentDidMount () {
		this.shouldScroll = true
		this.scrollToBottom()
	}
	componentWillUpdate (nextProps) {
		const {
			scrollArea
		} = this
		if (scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = scrollArea.scrollTop >= scrollArea.scrollHeight - scrollArea.offsetHeight
		}
	}

	componentWillReceiveProps (nextProps) {
		const {
			pendingMessages
		} = this.state

		if (pendingMessages.length) {
			const stillPending = pendingMessages.filter((item) => {
				const match = _.find(nextProps.tail, {
					slug: item.slug
				})
				return !match
			})

			this.setState({
				pendingMessages: stillPending
			})
		}
	}

	componentDidUpdate () {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom()
	}

	scrollToBottom () {
		if (!this.scrollArea) {
			return
		}
		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight
		}
	}
	addMessage (event) {
		event.preventDefault()
		const {
			newMessage
		} = this.state
		if (!newMessage) {
			return
		}
		this.setState({
			newMessage: ''
		})
		const {
			allUsers
		} = this.props
		const mentions = helpers.getUserIdsByPrefix('@', newMessage, allUsers)
		const alerts = helpers.getUserIdsByPrefix('!', newMessage, allUsers)
		const tags = helpers.findWordsByPrefix('#', newMessage).map((tag) => {
			return tag.slice(1).toLowerCase()
		})
		const message = {
			target: this.props.card,
			type: 'message',
			tags,
			slug: `message-${uuid()}`,
			payload: {
				mentionsUser: mentions,
				alertsUser: alerts,
				message: newMessage
			}
		}

		// Synthesize the event card and add it to the pending messages so it can be
		// rendered in advance of the API request completing it
		this.setState({
			pendingMessages: this.state.pendingMessages.concat({
				pending: true,
				type: message.type,
				tags,
				slug: message.slug,
				data: {
					actor: this.props.user.id,
					payload: message.payload,
					target: this.props.card.id
				}
			})
		})

		sdk.event.create(message)
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'message'
					}
				})
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error)
			})
	}

	handleCardVisible (card) {
		const userSlug = this.props.user.slug
		if (card.type === 'message' || card.type === 'whisper') {
			const message = _.get(card, [ 'data', 'payload', 'message' ], '')

			// Only continue if the message mentions the current user
			if (message.includes(`@${userSlug.slice(5)}`) || message.includes(`!${userSlug.slice(5)}`)) {
				const readBy = _.get(card, [ 'data', 'readBy' ], [])

				if (!_.includes(readBy, userSlug)) {
					readBy.push(userSlug)

					card.data.readBy = readBy

					sdk.card.update(card.id, card)
						.catch((error) => {
							console.error(error)
						})
				}
			}
		}
	}

	render () {
		const head = this.props.card
		const {
			tail
		} = this.props
		const props = _.omit(this.props, [ 'card', 'action', 'allUsers', 'tail', 'type', 'user' ])
		const {
			messagesOnly,
			pendingMessages
		} = this.state

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id')
		if (messagesOnly) {
			_.remove(sortedTail, (item) => {
				return item.type !== 'message' && item.type !== 'whisper'
			})
		}

		return (
			<Column {...props}>
				<rendition.Flex my={2} mr={2} justify="flex-end">
					<rendition.Button
						plaintext
						tooltip={{
							placement: 'left',
							text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`
						}}
						className="timeline__checkbox--additional-info"
						color={messagesOnly ? rendition.Theme.colors.text.light : false}
						ml={2}
						onClick={this.handleEventToggle}
					>
						<Icon.default name="stream"/>
					</rendition.Button>
				</rendition.Flex>

				<div
					ref={(ref) => {
						this.scrollArea = ref
					}}
					style={{
						flex: 1,
						overflowY: 'auto',
						borderTop: '1px solid #eee',
						paddingTop: 8
					}}
				>
					{!sortedTail && (<rendition.Box p={3}>
						<Icon.default spin name="cog"/>
					</rendition.Box>)}

					{(Boolean(sortedTail) && sortedTail.length > 0) && _.map(sortedTail, (item) => {
						return (
							<rendition.Box key={item.id}>
								<Event
									onCardVisible={this.handleCardVisible}
									card={item}
								/>
							</rendition.Box>
						)
					})}
					{Boolean(pendingMessages.length) && _.map(pendingMessages, (item) => {
						return (
							<rendition.Box key={item.slug}>
								<Event
									card={item}
								/>
							</rendition.Box>
						)
					})}
				</div>

				{head && head.type !== 'view' &&
					<rendition.Flex
						style={{
							borderTop: '1px solid #eee'
						}}
					>
						<rendition.Box flex="1" px={3} pt={3} pb={2}>
							<AutocompleteTextarea.default
								user={this.props.user}
								className="new-message-input"
								value={this.state.newMessage}
								onChange={this.handleNewMessageChange}
								onTextSubmit={this.handleNewMessageSubmit}
								placeholder="Type to comment on this thread..."
							/>
						</rendition.Box>

						<rendition.Button
							square
							mr={3}
							mt={3}
							data-test="file-upload-button"
							onClick={this.handleUploadButtonClick}
						>
							<Icon.default name="image"/>
						</rendition.Button>

						<input
							style={{
								display: 'none'
							}}
							type="file"
							ref={(el) => {
								this.fileInputElement = el
							}}
							onChange={this.handleFileChange}
						/>
					</rendition.Flex>
				}
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		allUsers: selectors.getAllUsers(state),
		user: selectors.getCurrentUser(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addNotification: redux.bindActionCreators(actionCreators.addNotification, dispatch)
		}
	}
}
const lens = {
	slug: 'lens-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(TimelineRenderer),

		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time'
							},
							actor: {
								type: 'string',
								format: 'uuid'
							},
							payload: {
								type: 'object'
							}
						},
						required: [
							'timestamp',
							'actor'
						]
					}
				}
			}
		}
	}
}
exports.default = lens
