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
import MentionsCount from './MentionsCount'
import TreeMenu from './TreeMenu'
import {
	ViewLink
} from './ViewLink'
import Gravatar from '../../shame/Gravatar'
import Icon from '../../shame/Icon'
import MenuPanel from '../../shame/MenuPanel'

// View slugs that should be displayed first
const DEFAULT_VIEWS = [
	'view-my-inbox',
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

export default class HomeChannel extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			showMenu: false,
			tail: null,
			messages: []
		}

		this.open = this.open.bind(this)
		this.logout = this.logout.bind(this)
		this.showMenu = this.showMenu.bind(this)
		this.hideMenu = this.hideMenu.bind(this)
		this.toggleExpandGroup = this.toggleExpandGroup.bind(this)
		this.isExpanded = this.isExpanded.bind(this)

		if (this.props.channel.data.head) {
			this.props.actions.loadViewResults(this.props.channel.data.head)
			this.props.actions.streamView(this.props.channel.data.head)
		}

		this.props.actions.loadViewResults('view-my-inbox')
		this.props.actions.streamView('view-my-inbox')
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

	open (card, options) {
		if (this.props.viewNotices[card.id]) {
			this.props.actions.removeViewNotice(card.id)
		}
		this.props.actions.addChannel({
			target: card.id,
			cardType: 'view',
			head: card,
			parentChannel: this.props.channel.id,
			options
		})
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidUpdate (prevProps) {
		if (!prevProps.channel.data.head && this.props.channel.data.head) {
			this.props.actions.loadViewResults(this.props.channel.data.head)
			this.props.actions.streamView(this.props.channel.data.head)
		}

		// If there is only 1 channel, check for the home channel, otherwise, open
		// the all messages view by default
		if (!prevProps.tail && this.props.tail && this.props.channels.length === 1) {
			const view = getDefaultView(this.props.user, this.props.tail)
			if (view) {
				this.open(view)
			}
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
		const email = user ? user.data.email : null
		const username = user ? user.slug.replace(/user-/, '') : null
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
					<Button plain={true} className="user-menu-toggle" py={3} pl={3} pr={2} onClick={this.showMenu}>
						<Gravatar.default email={email}/>

						{Boolean(username) && <Txt mx={2}>{username}</Txt>}

						<Icon name="caret-down"/>

						{mentions && mentions.length > 0 && (
							<MentionsCount>{mentions.length}</MentionsCount>
						)}
					</Button>
				</Flex>

				{this.state.showMenu && (
					<Fixed top={true} right={true} bottom={true} left={true} z={9999999} onClick={this.hideMenu}>
						<MenuPanel className="user-menu" mx={3} p={3}>
							{user && (<Link mb={2} href={`#/${user.id}`}>Your profile</Link>)}

							{_.map(defaultViews, (card) => {
								const isActive = card.id === _.get(activeChannel, [ 'data', 'target' ])
								const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ])
								return (<Box mx={-3} key={card.id}>
									<ViewLink
										card={card}
										isActive={isActive}
										activeSlice={activeSlice}
										update={card.slug === 'view-my-inbox' ? (mentions && mentions.length) : 0}
										open={this.open}
									/>
								</Box>)
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
