/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
	Divider,
	Fixed,
	Flex,
	Link,
	Txt
} from 'rendition'
import styled from 'styled-components'
import * as store from '../core/store'
import * as helpers from '../services/helpers'
import {
	TailStreamer
} from './TailStreamer'
import {
	ViewLink
} from './ViewLink'
import Gravatar from '../shame/Gravatar'
import Icon from '../shame/Icon'

// View slugs that should be displayed first
const DEFAULT_VIEWS = [
	'view-my-alerts',
	'view-my-mentions',
	'view-my-todo-items',
	'view-my-orgs'
]

const TreeMenu = (props) => {
	const {
		node
	} = props
	if (!node.children.length && node.card) {
		const card = node.card

		const isActive = card.id === _.get(props.activeChannel, [ 'data', 'target' ])
		const activeSlice = _.get(props.activeChannel, [ 'data', 'options', 'slice' ])
		const update = props.viewNotices[card.id]
		return (
			<ViewLink
				key={card.id}
				card={card}
				isActive={isActive}
				activeSlice={activeSlice}
				update={update}
				open={props.open}
			/>
		)
	}

	const isExpanded = node.key === 'root' || props.isExpanded(node.name)

	return (
		<Box key={node.key}>
			{node.name && (
				<Button
					plaintext
					primary
					w="100%"
					px={3}
					my={2}
					data-groupname={node.name}
					data-test={`home-channel__group-toggle--${node.key}`}
					onClick={props.toggleExpandGroup}
				>
					<Flex style={{
						width: '100%'
					}} justify="space-between">
						{node.name}
						<Icon name={`chevron-${isExpanded ? 'up' : 'down'}`}/>
					</Flex>
				</Button>
			)}

			<Box
				style={{
					display: isExpanded ? 'block' : 'none'
				}}
				pl={node.key === 'root' ? 0 : 2}
			>
				{node.children.map((child) => {
					return (
						<TreeMenu
							key={child.key}
							node={child}
							isExpanded={props.isExpanded}
							toggleExpandGroup={props.toggleExpandGroup}
							activeChannel={props.activeChannel}
							viewNotices={props.viewNotices}
							open={props.open}
						/>
					)
				})}
			</Box>
		</Box>
	)
}

const viewsToTree = (views, root = {}) => {
	const result = _.defaults(root, {
		name: null,
		key: 'root',
		children: []
	})

	for (const view of views) {
		let node = result
		if (view.data.namespace) {
			const parts = view.data.namespace.split('.')
			for (const part of parts) {
				let exists = false
				for (const item of result.children) {
					if (item.name === part) {
						node = item
						exists = true
						break
					}
				}

				if (!exists) {
					node.children.push({
						name: part,
						key: part,
						children: []
					})

					node = node.children[node.children.length - 1]
				}
			}
		}

		node.children.push({
			name: view.name,
			key: view.slug,
			card: view,
			children: []
		})
	}

	return result
}

const getDefaultView = (user, views) => {
	const homeViewId = _.get(user, [ 'data', 'profile', 'homeView' ])
	if (homeViewId) {
		const homeView = _.find(views, {
			id: homeViewId
		})
		if (homeView) {
			return homeView
		}
	}
	return _.find(views, {
		slug: 'view-all-messages'
	}) || null
}

const MenuPanel = styled(Box) `
	position: absolute;
	top: 64px;
	width: 180px;
	background: white;
	box-shadow: 0 1px 4px rgba(17, 17, 17, 0.5);
	border-radius: 3px;

	&::before {
		content: '';
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 5px solid #ccc;
		position: absolute;
    top: -6px;
		left: 14px;
	}

	&::after {
		content: '';
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 5px solid white;
		position: absolute;
    top: -5px;
		left: 14px;
	}
`

const UserMenuBtn = styled(Button) `
	background: transparent;
	color: #888;

	&:hover,
	&:focus,
	&:active {
		color: #333;
	}
`

class HomeChannelBase extends TailStreamer {
	constructor (props) {
		super(props)
		this.state = {
			showMenu: false,
			tail: null,
			messages: []
		}
		this.streamTail(this.props.channel.data.target)

		this.open = this.open.bind(this)
		this.logout = this.logout.bind(this)
		this.showMenu = this.showMenu.bind(this)
		this.hideMenu = this.hideMenu.bind(this)
		this.toggleExpandGroup = this.toggleExpandGroup.bind(this)
		this.isExpanded = this.isExpanded.bind(this)
	}

	groupViews (tail) {
		const groups = {
			defaults: [],
			main: {
				name: null,
				key: 'root',
				children: []
			}
		}

		// Sorty by name, then sort the priority views to the top
		const [ defaults, nonDefaults ] = _.partition(tail, (view) => {
			return _.includes(DEFAULT_VIEWS, view.slug)
		})
		groups.defaults = defaults

		const [ myViews, otherViews ] = _.partition(nonDefaults, (view) => {
			return _.includes(view.markers, this.props.user.slug)
		})
		if (myViews.length) {
			groups.main.children.push(viewsToTree(myViews, {
				name: 'My views',
				key: '__myViews'
			}))
		}
		const remaining = _.groupBy(otherViews, 'markers[0]')
		_.forEach(remaining, (views, key) => {
			if (key !== 'undefined') {
				const org = _.find(this.props.orgs, {
					slug: key
				})
				groups.main.children.push(viewsToTree(views, {
					name: org ? org.name : 'Unknown organisation',
					key
				}))
			}
		})

		return groups
	}

	toggleExpandGroup (event) {
		const name = event.currentTarget.dataset.groupname
		const state = _.cloneDeep(this.props.uiState)
		if (this.isExpanded(name)) {
			state.sidebar.expanded = _.without(state.sidebar.expanded, name)
		} else {
			state.sidebar.expanded.push(name)
		}
		this.props.actions.setUIState(state)
	}

	showMenu () {
		this.setState({
			showMenu: true
		})
	}

	hideMenu () {
		this.setState({
			showMenu: false
		})
	}

	logout () {
		this.props.actions.logout()
	}

	open (card, options) {
		if (this.props.viewNotices[card.id]) {
			this.props.actions.removeViewNotice(card.id)
		}
		this.props.actions.addChannel(helpers.createChannel({
			target: card.id,
			cardType: 'view',
			head: card,
			parentChannel: this.props.channel.id,
			options
		}))
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}
	setTail (tail) {
		// If there is only 1 channel, check for the home channel, otherwise, open
		// the all messages view by default
		if (this.props.channels.length === 1) {
			const view = getDefaultView(this.props.user, tail)
			if (view) {
				this.open(view)
			}
		}
		this.setState({
			tail: _.sortBy(tail, 'name')
		})
	}
	isExpanded (name) {
		return _.includes(_.get(this.props.uiState, [ 'sidebar', 'expanded' ], []), name)
	}
	render () {
		const {
			channels, channel: {
				data: {
					head
				}
			}, user
		} = this.props
		const {
			tail
		} = this.state
		const activeChannel = channels.length > 1 ? channels[1] : null
		const email = user ? user.data.email : null
		const username = user ? user.slug.replace(/user-/, '') : null
		if (!head) {
			return <Icon style={{
				color: 'white'
			}} name="cog fa-spin"/>
		}
		const groupedViews = this.groupViews(tail)
		const groups = groupedViews.main
		const defaultViews = groupedViews.defaults
		const defaultUpdate = _.some(defaultViews, (card) => {
			const update = this.props.viewNotices[card.id]
			return update && (update.newMentions || update.newContent)
		})

		return (
			<Flex
				className="home-channel"
				flexDirection="column"
				flex="0 0 180px"
				style={{
					height: '100%', overflowY: 'auto'
				}}
			>
				<Flex justify="space-between" style={{
					position: 'relative'
				}}>
					<UserMenuBtn plaintext={true} className="user-menu-toggle" py={3} pl={3} pr={2} onClick={this.showMenu}>
						<Gravatar.default email={email}/>

						{Boolean(username) && <Txt mx={2}>{username}</Txt>}

						<Icon name="caret-down"/>

						{defaultUpdate && (<Icon name="circle" style={{
							color: 'green',
							top: 44,
							left: 44,
							fontSize: 11,
							position: 'absolute'
						}}/>)}
					</UserMenuBtn>
				</Flex>

				{this.state.showMenu && (
					<Fixed top={true} right={true} bottom={true} left={true} z={9999999} onClick={this.hideMenu}>
						<MenuPanel className="user-menu" mx={3} p={3}>
							{user && (<Link mb={2} href={`#/${user.id}`}>Your profile</Link>)}

							{_.map(defaultViews, (card) => {
								const isActive = card.id === _.get(activeChannel, [ 'data', 'target' ])
								const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ])
								const update = this.props.viewNotices[card.id]
								return (<Box mx={-3} key={card.id}>
									<ViewLink
										card={card}
										isActive={isActive}
										activeSlice={activeSlice}
										update={update}
										open={this.open}
									/>
								</Box>)
							})}

							<Divider my={2} bg="#eee" style={{
								height: 1, backgroundColor: '#eeeeee'
							}}/>

							<Button w="100%" pt={2} className="user-menu__logout" plaintext={true} style={{
								textAlign: 'left', display: 'block'
							}} onClick={this.logout}>
							Log out
							</Button>
						</MenuPanel>
					</Fixed>
				)}

				<Box
					flex="1"
					style={{
						overflowY: 'auto'
					}}
				>
					{!tail && (
						<Box p={3}>
							<Icon name="cog fa-spin"/>
						</Box>
					)}

					{Boolean(tail) && (
						<TreeMenu
							node={groups}
							isExpanded={this.isExpanded}
							toggleExpandGroup={this.toggleExpandGroup}
							activeChannel={activeChannel}
							viewNotices={this.props.viewNotices}
							open={this.open}
						/>
					)}
				</Box>

				<Link
					p={2}
					fontSize={1}
					href='https://github.com/balena-io/jellyfish/blob/master/CHANGELOG.md'
					blank
				>
					<Txt monospace>
							v{this.props.version} {this.props.codename}
					</Txt>
				</Link>
			</Flex>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		channels: store.selectors.getChannels(state),
		user: store.selectors.getCurrentUser(state),
		version: store.selectors.getAppVersion(state),
		orgs: store.selectors.getOrgs(state),
		codename: store.selectors.getAppCodename(state),
		viewNotices: store.selectors.getViewNotices(state),
		uiState: store.selectors.getUIState(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(HomeChannelBase)
