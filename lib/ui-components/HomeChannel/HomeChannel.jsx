/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Divider,
	Fixed,
	Flex,
	Link,
	Txt
} from 'rendition'
import MentionsCount from '../MentionsCount'
import TreeMenu from './TreeMenu'
import RouterLink from '../Link'
import ViewLink from '../ViewLink'
import Avatar from '@jellyfish/ui-components/shame/Avatar'
import Icon from '@jellyfish/ui-components/shame/Icon'
import MenuPanel from '@jellyfish/ui-components/shame/MenuPanel'

// View slugs that should be displayed first
const DEFAULT_VIEWS = [
	'view-my-todo-items',
	'view-my-orgs'
]

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

export default class HomeChannel extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			showMenu: false,
			tail: null,
			messages: []
		}

		this.logout = this.logout.bind(this)
		this.showMenu = this.showMenu.bind(this)
		this.hideMenu = this.hideMenu.bind(this)
		this.toggleExpandGroup = this.toggleExpandGroup.bind(this)
		this.isExpanded = this.isExpanded.bind(this)
		this.openCreateViewChannel = this.openCreateViewChannel.bind(this)
		this.openChatWidget = this.openChatWidget.bind(this)

		if (this.props.channel.data.head) {
			this.props.actions.loadViewResults(this.props.channel.data.head)
			this.props.actions.streamView(this.props.channel.data.head)
		}

		this.props.actions.loadViewResults('view-my-inbox')
		this.props.actions.streamView('view-my-inbox')
	}

	openCreateViewChannel () {
		this.props.actions.addChannel({
			head: {
				action: 'create-view',
				onDone: {
					action: 'open'
				}
			},
			canonical: false
		})
	}

	openChatWidget () {
		this.props.actions.setChatWidgetOpen(true)
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
			return _.startsWith(view.slug, 'view-121') || _.includes(view.markers, this.props.user.slug)
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
		const state = clone(this.props.uiState)
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

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidUpdate (prevProps) {
		if (!prevProps.channel.data.head && this.props.channel.data.head) {
			this.props.actions.loadViewResults(this.props.channel.data.head)
			this.props.actions.streamView(this.props.channel.data.head)
		}
	}

	static getDerivedStateFromProps (nextProps, nextState) {
		const {
			tail
		} = nextProps

		return tail ? {
			tail: _.sortBy(tail, 'name')
		} : null
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
			},
			user,
			mentions
		} = this.props

		const {
			tail
		} = this.state
		const activeChannel = channels.length > 1 ? channels[1] : null
		const username = user ? (user.name || user.slug.replace(/user-/, '')) : null
		if (!head) {
			return (
				<Box p={3}>
					<Icon
						spin
						name="cog"
					/>
				</Box>
			)
		}
		const groupedViews = this.groupViews(tail)
		const groups = groupedViews.main
		const defaultViews = groupedViews.defaults
		const activeChannelTarget = _.get(activeChannel, [ 'data', 'target' ])
		const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ])

		return (
			<Flex
				className="home-channel"
				flexDirection="column"
				flex="0 0 180px"
				style={{
					height: '100%', overflowY: 'auto'
				}}
			>
				<Flex justifyContent="space-between" style={{
					position: 'relative'
				}}>
					<Button plain={true} className="user-menu-toggle" py={3} pl={3} pr={2} onClick={this.showMenu} style={{
						display: 'flex',
						maxWidth: '100%'
					}}>
						<Avatar
							name={username}
							url={_.get(user, [ 'data', 'avatar' ])}
						/>
						{Boolean(username) && <Txt mx={2} style={{
							textOverflow: 'ellipsis',
							flex: '1 1 0%',
							whiteSpace: 'nowrap',
							overflow: 'hidden'
						}}>{username}</Txt>}

						<Icon name="caret-down"/>

						{mentions && mentions.length > 0 && (
							<MentionsCount style={{
								position: 'absolute',
								left: '30px',
								bottom: '10px'
							}}>{(mentions.length >= 100) ? '99+' : mentions.length}</MentionsCount>
						)}
					</Button>
				</Flex>

				{this.state.showMenu && (
					<Fixed top={true} right={true} bottom={true} left={true} z={9999999} onClick={this.hideMenu}>
						<MenuPanel className="user-menu" mx={3} p={3}>
							{user && (
								<div>
									<RouterLink
										mb={2}
										to={`/${user.slug}`}
									>
										Settings
									</RouterLink>
								</div>
							)}

							<RouterLink
								mb={2}
								to="/inbox"
								style={{
									display: 'block'
								}}
							>
								<Flex justifyContent="space-between">
									Inbox

									{(mentions && mentions.length > 0) && (
										<MentionsCount mr={2}>{mentions.length}</MentionsCount>
									)}
								</Flex>
							</RouterLink>

							{_.map(defaultViews, (card) => {
								const isActive = card.slug === activeChannelTarget ||
									card.id === activeChannelTarget

								// The inbox view is only used to easily facilitate streaming of
								// mentions
								// TODO find a more elegant way to handle this
								if (card.slug === 'view-my-inbox') {
									return null
								}

								return (
									<Box mx={-3} key={card.id}>
										<ViewLink
											card={card}
											isActive={isActive}
											activeSlice={activeSlice}
											update={card.slug === 'view-my-inbox' ? (mentions && mentions.length) : 0}
											open={this.open}
										/>
									</Box>
								)
							})}

							<Divider my={2} bg="#eee" style={{
								height: 1, backgroundColor: '#eeeeee'
							}}/>

							<Button w="100%" pt={2} className="user-menu__logout" plain={true} style={{
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
							<Icon spin name="cog"/>
						</Box>
					)}

					{Boolean(tail) && (
						<TreeMenu
							node={groups}
							isExpanded={this.isExpanded}
							toggleExpandGroup={this.toggleExpandGroup}
							activeChannel={activeChannel}
							viewNotices={this.props.viewNotices}
						/>
					)}
				</Box>

				<Box
					style={{
						borderTop: '1px solid #eee',
						borderBottom: '1px solid #eee'
					}}
					px={3}
					py={2}
				>
					<Button
						plain
						icon={<Icon name="plus" />}
						data-test="create-private-conversation"
						onClick={this.openCreateViewChannel}
						tooltip={{
							placement: 'right',
							text: 'Create a new private conversation'
						}}
					/>

					<Button
						ml={2}
						plain
						icon={<Icon name="comment-alt" />}
						data-test="open-chat-widget"
						onClick={this.openChatWidget}
						tooltip={{
							placement: 'right',
							text: 'Open a chat widget'
						}}
					/>
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
