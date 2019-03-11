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
const styledComponents = require('styled-components')
const store = require('../../core/store')
const helpers = require('../../services/helpers')
const storeHelpers = require('../../services/store-helpers')
const Gravatar = require('../../shame/Gravatar')
const Icon = require('../../shame/Icon')
const InboxPill = require('./InboxPill')
const {
	getCreator,
	getLastUpdate
} = require('./utils')
const Column = styledComponents.default(rendition.Flex) `
	height: 100%;
	width: 100%;
`
const SupportThreadSummaryWrapper = styledComponents.default(rendition.Box) `
	border-left-style: solid;
	border-left-width: 3px;
	border-bottom: 1px solid #eee;
	cursor: pointer;
	transition: background ease-in-out 150ms;

	&:hover {
		background: ${rendition.Theme.colors.gray.light};
	}
`
class Interleaved extends React.Component {
	constructor (props) {
		super(props)
		this.openChannel = (target, obj) => {
			// If a card is not provided, see if a matching card can be found from this
			// component's state/props
			const card = obj || _.find(this.props.tail || [], {
				id: target
			})
			const newChannel = helpers.createChannel({
				cardType: card.type,
				target,
				head: card,
				parentChannel: this.props.channel.id
			})
			this.props.actions.addChannel(newChannel)
		}
		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false
		}

		this.handleScroll = async () => {
			const {
				scrollArea, loadingPage
			} = this
			if (!scrollArea) {
				return
			}
			this.scrollBottomOffset = scrollArea.scrollHeight - (scrollArea.scrollTop + scrollArea.offsetHeight)
			if (loadingPage) {
				return
			}
			if (this.scrollBottomOffset > 200) {
				return
			}
			this.loadingPage = true
			await this.props.setPage(this.props.page + 1)
			this.loadingPage = false
		}
	}

	render () {
		const tail = _.sortBy(this.props.tail, (element) => {
			const timestamps = _.map(element.links['has attached element'], 'data.timestamp')
			timestamps.sort()
			return _.last(timestamps)
		}).reverse()
		return (<Column flexDirection="column">
			<div
				ref={(ref) => {
					this.scrollArea = ref
				}}
				onScroll={this.handleScroll}
				style={{
					flex: 1,
					paddingBottom: 16,
					overflowY: 'auto'
				}}
			>
				{(Boolean(tail) && tail.length > 0) && _.map(tail, (card) => {
					const timeline = _.sortBy(card.links['has attached element'], 'data.timestamp')
					const messages = _.filter(timeline, (event) => {
						return event.type === 'message' || event.type === 'whisper'
					})
					const lastMessageOrWhisper = _.last(messages)
					const actor = getCreator(card)
					const lastActor = lastMessageOrWhisper ? storeHelpers.getActor(lastMessageOrWhisper.data.actor) : null
					return (
						<SupportThreadSummaryWrapper
							key={card.id}
							p={3}
							style={{
								borderLeftColor: helpers.colorHash(card.id)
							}}
							onClick={() => {
								return this.openChannel(card.id)
							}}
						>
							<rendition.Flex justify="space-between">
								<InboxPill.default card={card} mb={2} />

								<rendition.Txt>Created {helpers.formatTimestamp(card.created_at)}</rendition.Txt>
							</rendition.Flex>
							<rendition.Flex justify="space-between">
								<rendition.Box>
									{Boolean(card.name) && (
										<rendition.Txt bold>{card.name}</rendition.Txt>
									)}
									{!card.name && Boolean(actor) && (
										<rendition.Txt bold>{`Conversation with ${actor.name}`}</rendition.Txt>
									)}
								</rendition.Box>

								<rendition.Txt>
									Updated {helpers.timeAgo(_.get(getLastUpdate(card), [ 'data', 'timestamp' ]))}
								</rendition.Txt>
							</rendition.Flex>
							<rendition.Txt my={2}>{messages.length} message{messages.length !== 1 && 's'}</rendition.Txt>
							{lastMessageOrWhisper && (<rendition.Flex>
								<Gravatar.default small pr={2} email={lastActor ? lastActor.email : null}/>

								<rendition.Txt style={{
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									border: '1px solid #eee',
									borderRadius: 10,
									padding: '4px 16px',
									background: (lastMessageOrWhisper || {}).type === 'whisper' ? '#eee' : 'white',
									flex: 1
								}}>
									{_.get(lastMessageOrWhisper, [ 'data', 'payload', 'message' ], '').split('\n').shift()}
								</rendition.Txt>
							</rendition.Flex>)}
						</SupportThreadSummaryWrapper>
					)
				})}

				{this.props.totalPages > this.props.page + 1 && (
					<rendition.Box p={3}>
						<Icon.default name="cog fa-spin"/>
					</rendition.Box>
				)}
			</div>
		</Column>)
	}
}
exports.Interleaved = Interleaved
const mapStateToProps = (state) => {
	return {
		allUsers: store.selectors.getAllUsers(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
const lens = {
	slug: 'lens-support-threads',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Interleaved),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					}
				}
			}
		}
	}
}
exports.default = lens
