/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Button,
	Box,
	Flex,
	Link
} from 'rendition'
import MentionsCount from '../MentionsCount'
import helpers from '../../services/helpers'
import ContextMenu from '../ContextMenu'
import NotificationsModal from '../NotificationsModal'
import Icon from '../../shame/Icon'

export default class ViewLink extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showMenu: false,
			showSettings: false
		}

		this.open = this.open.bind(this)
		this.openSlice = this.openSlice.bind(this)
		this.saveNotificationSettings = this.saveNotificationSettings.bind(this)
		this.setDefault = this.setDefault.bind(this)
		this.toggleMenu = this.toggleMenu.bind(this)
		this.toggleSettings = this.toggleMenu.bind(this)
	}

	open (options) {
		this.props.open(this.props.card, options)
	}

	toggleMenu () {
		this.setState({
			showMenu: !this.state.showMenu
		})
	}

	toggleSettings () {
		this.setState({
			showSettings: !this.state.showSettings
		})
	}

	setDefault () {
		this.props.setDefault(this.props.card)
	}

	saveNotificationSettings (settings) {
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
			activeSlice,
			card,
			isActive,
			types,
			update
		} = this.props

		const slices = isActive ? helpers.getViewSlices(card, types) : null

		return (
			<Box>
				<Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? '#eee' : 'none'}>
					<Link
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
						<Flex justifyContent="space-between">
							{card.name}

							{Boolean(update) && card.slug === 'view-my-inbox' && (
								<MentionsCount mr={2}>{update}</MentionsCount>
							)}
						</Flex>
					</Link>

					{isActive &&
							<Button
								pr={3}
								pl={1}
								plain
								onClick={this.toggleMenu}
								icon={<Icon name="ellipsis-v"/>}
							/>
					}

					{this.state.showMenu &&
							<ContextMenu.ContextMenu onClose={this.toggleMenu}>
								<Button style={{
									display: 'block'
								}} mb={2} plain onClick={this.toggleSettings}>
									Settings
								</Button>
								<Button
									style={{
										display: 'block'
									}}
									plain
									tooltip="Set this view as the default page when logging in"
									onClick={this.setDefault}
								>
									Set as default
								</Button>
							</ContextMenu.ContextMenu>}

					<NotificationsModal.NotificationsModal
						show={this.state.showSettings}
						settings={this.getNotificationSettings()}
						onCancel={this.toggleSettings}
						onDone={this.saveNotificationSettings}
					/>
				</Flex>
				{isActive && Boolean(slices) && (
					<ul
						style={{
							padding: 0, margin: 0, listStyle: 'none'
						}}
					>
						{_.map(slices, (slice) => {
							return (
								<React.Fragment key={slice.path}>
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
												<Link
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
												</Link>
											</li>
										)
									})}
								</React.Fragment>
							)
						})}
					</ul>
				)}
			</Box>
		)
	}
}
