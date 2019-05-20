/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	circularDeepEqual
} = require('fast-equals')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const styledComponents = require('styled-components')
const MentionsCount = require('../MentionsCount').default
const {
	selectors,
	actionCreators
} = require('../../core')
const helpers = require('../../services/helpers')
const ContextMenu = require('../ContextMenu')
const NotificationsModal = require('../NotificationsModal')
const Icon = require('../../shame/Icon')
const EllipsisButton = styledComponents.default(rendition.Button) `
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: #333;
	}
`
class ViewLinkBase extends React.Component {
	constructor (props) {
		super(props)
		this.open = (options) => {
			this.props.open(this.props.card, options)
		}
		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}
		this.toggleSettings = () => {
			this.setState({
				showSettings: !this.state.showSettings
			})
		}
		this.setDefault = () => {
			this.props.setDefault(this.props.card)
		}
		this.saveNotificationSettings = (settings) => {
			const {
				subscription
			} = this.props
			if (!subscription) {
				return
			}
			subscription.data.notificationSettings = settings
			this.props.saveSubscription(subscription, this.props.card.id)
			this.setState({
				showSettings: false
			})
		}
		this.openSlice = this.openSlice.bind(this)
		this.state = {
			showMenu: false,
			showSettings: false
		}
	}
	getNotificationSettings () {
		return _.get(this.props.subscription, [ 'data', 'notificationSettings' ]) || {}
	}
	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}
	openSlice (event) {
		event.preventDefault()

		const title = event.target.dataset.slicetitle
		const path = event.target.dataset.slicepath
		const value = event.target.dataset.slicevalue

		this.open({
			slice: {
				title,
				path,
				value
			}
		})
	}
	render () {
		const {
			activeSlice, card, isActive, types, update
		} = this.props
		const slices = isActive ? helpers.getViewSlices(card, types) : null
		return (
			<rendition.Box>
				<rendition.Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? '#eee' : 'none'}>
					<rendition.Link
						data-test={`home-channel__item--${card.slug}`}
						style={{
							display: 'block',
							flex: '1'
						}}
						key={card.id}
						py={2}
						pl={3}
						pr={isActive ? 0 : 3}
						color="#333"
						href={`#/view~${card.id}`}
					>
						<rendition.Flex justifyContent="space-between">
							{card.name}

							{Boolean(update) && card.slug === 'view-my-inbox' && (
								<MentionsCount mr={2}>{update}</MentionsCount>
							)}
						</rendition.Flex>
					</rendition.Link>

					{isActive &&
							<EllipsisButton pr={3} pl={1} plain onClick={this.toggleMenu}>
								<Icon.default name="ellipsis-v"/>
							</EllipsisButton>}

					{this.state.showMenu &&
							<ContextMenu.ContextMenu onClose={this.toggleMenu}>
								<rendition.Button style={{
									display: 'block'
								}} mb={2} plain onClick={this.toggleSettings}>
									Settings
								</rendition.Button>
								<rendition.Button
									style={{
										display: 'block'
									}}
									plain
									tooltip="Set this view as the default page when logging in"
									onClick={this.setDefault}
								>
									Set as default
								</rendition.Button>
							</ContextMenu.ContextMenu>}

					<NotificationsModal.NotificationsModal
						show={this.state.showSettings}
						settings={this.getNotificationSettings()}
						onCancel={this.toggleSettings}
						onDone={this.saveNotificationSettings}
					/>
				</rendition.Flex>
				{isActive && Boolean(slices) && (
					<ul
						style={{
							padding: 0, margin: 0, listStyle: 'none'
						}}
					>
						{_.map(slices, (slice) => {
							return (<React.Fragment key={slice.path}>
								{_.map(slice.values, (value) => {
									const isActiveSlice = activeSlice && (
										activeSlice.path === slice.path && activeSlice.value === value
									)
									return (
										<li
											key={value}
											style={{
												background: (isActiveSlice) ? '#eee' : 'none'
											}}
										>
											<rendition.Link
												style={{
													display: 'block'
												}}
												py={2}
												pr={3}
												pl={4}
												color="#333"
												href={`#/view~${card.id}`}
												data-slicetitle={slice.title}
												data-slicepath={slice.path}
												data-slicevalue={value}
												onClick={this.openSlice}
											>
												{slice.title}: {value}
											</rendition.Link>
										</li>
									)
								})}
							</React.Fragment>)
						})}
					</ul>
				)}
			</rendition.Box>
		)
	}
}
const mapStateToProps = (state, ownProps) => {
	return {
		subscription: selectors.getSubscription(state, ownProps.card.id),
		types: selectors.getTypes(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return redux.bindActionCreators({
		saveSubscription: actionCreators.saveSubscription,
		setDefault: actionCreators.setDefault
	}, dispatch)
}
exports.ViewLink = connect(mapStateToProps, mapDispatchToProps)(ViewLinkBase)
