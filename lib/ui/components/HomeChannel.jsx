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
const Markdown = require('rendition/dist/extra/Markdown')
const styledComponents = require('styled-components')
const store = require('../core/store')
const helpers = require('../services/helpers')
const TailStreamer = require('./TailStreamer')
const ViewLink = require('./ViewLink')
const Gravatar = require('../shame/Gravatar')
const Icon = require('../shame/Icon')

// View slugs that should be displayed first
const PRIORITY_VIEWS = [
	'view-my-alerts',
	'view-my-mentions',
	'view-my-todo-items',
	'view-my-orgs'
]
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
const MenuPanel = styledComponents.default(rendition.Box) `
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
const UserMenuBtn = styledComponents.default(rendition.Button) `
	background: transparent;
	color: #888;

	&:hover,
	&:focus,
	&:active {
		color: #333;
	}
`
class HomeChannelBase extends TailStreamer.TailStreamer {
	constructor (props) {
		super(props)
		this.open = (card, options) => {
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
		this.logout = () => {
			this.props.actions.logout()
		}
		this.showMenu = () => {
			this.setState({
				showMenu: true
			})
		}
		this.hideMenu = () => {
			this.setState({
				showMenu: false
			})
		}
		this.showChangelog = () => {
			this.setState({
				showChangelog: true
			})
		}
		this.hideChangelog = () => {
			this.setState({
				showChangelog: false
			})
		}
		this.toggleExpandGroup = (event) => {
			const name = event.currentTarget.dataset.groupname
			const state = _.cloneDeep(this.props.uiState)
			if (this.isExpanded(name)) {
				state.sidebar.expanded = _.without(state.sidebar.expanded, name)
			} else {
				state.sidebar.expanded.push(name)
			}
			this.props.actions.setUIState(state)
		}
		this.groupViews = (tail) => {
			const groups = []

			// Sorty by name, then sort the priority views to the top
			const [ defaults, nonDefaults ] = _.partition(tail, (view) => {
				return _.includes(PRIORITY_VIEWS, view.slug)
			})
			groups.push({
				name: 'defaults',
				views: defaults,
				key: '__defaults'
			})
			const [ myViews, otherViews ] = _.partition(nonDefaults, (view) => {
				return _.includes(view.markers, this.props.user.slug)
			})
			if (myViews.length) {
				groups.push({
					name: 'My views',
					views: myViews,
					key: '__myviews'
				})
			}
			const remaining = _.groupBy(otherViews, 'markers[0]')
			_.forEach(remaining, (views, key) => {
				if (key !== 'undefined') {
					const org = _.find(this.props.orgs, {
						slug: key
					})
					groups.push({
						name: org ? org.name : 'Unknown organisation',
						key,
						views
					})
				}
			})
			return groups
		}
		this.state = {
			showChangelog: false,
			showMenu: false,
			tail: null,
			messages: []
		}
		this.streamTail(this.props.channel.data.target)
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
			return <Icon.default style={{
				color: 'white'
			}} name="cog fa-spin"/>
		}
		const [ [ defaultViews ], groups ] = _.partition(this.groupViews(tail || []), [ 'key', '__defaults' ])
		const defaultUpdate = _.some(defaultViews.views, (card) => {
			const update = this.props.viewNotices[card.id]
			return update && (update.newMentions || update.newContent)
		})
		return (<rendition.Flex className="home-channel" flexDirection="column" flex="0 0 180px" style={{
			height: '100%', overflowY: 'auto'
		}}>
			<rendition.Flex justify="space-between" style={{
				position: 'relative'
			}}>
				<UserMenuBtn plaintext={true} className="user-menu-toggle" py={3} pl={3} pr={2} onClick={this.showMenu}>
					<Gravatar.default email={email}/>

					{Boolean(username) && <rendition.Txt mx={2}>{username}</rendition.Txt>}

					<Icon.default name="caret-down"/>

					{defaultUpdate && (<Icon.default name="circle" style={{
						color: 'green',
						top: 44,
						left: 44,
						fontSize: 11,
						position: 'absolute'
					}}/>)}
				</UserMenuBtn>
			</rendition.Flex>

			{this.state.showMenu && (
				<rendition.Fixed top={true} right={true} bottom={true} left={true} z={9999999} onClick={this.hideMenu}>
					<MenuPanel className="user-menu" mx={3} p={3}>
						{user && (<rendition.Link mb={2} href={`#/${user.id}`}>Your profile</rendition.Link>)}

						{_.map(defaultViews.views, (card) => {
							const isActive = card.id === _.get(activeChannel, [ 'data', 'target' ])
							const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ])
							const update = this.props.viewNotices[card.id]
							return (<rendition.Box mx={-3} key={card.id}>
								<ViewLink.ViewLink
									card={card}
									isActive={isActive}
									activeSlice={activeSlice}
									update={update}
									open={this.open}
								/>
							</rendition.Box>)
						})}

						<rendition.Divider my={2} bg="#eee" style={{
							height: 1, backgroundColor: '#eeeeee'
						}}/>

						<rendition.Button w="100%" pt={2} className="user-menu__logout" plaintext={true} style={{
							textAlign: 'left', display: 'block'
						}} onClick={this.logout}>
						Log out
						</rendition.Button>
					</MenuPanel>
				</rendition.Fixed>
			)}

			<rendition.Box flex="1">
				{!tail && <rendition.Box p={3}><Icon.default style={{
					color: 'white'
				}} name="cog fa-spin"/></rendition.Box>}

				{Boolean(tail) && _.map(groups, (group) => {
					const isExpanded = this.isExpanded(group.name)
					return (<React.Fragment key={group.name}>
						<rendition.Button
							plaintext
							primary
							w="100%"
							px={3}
							my={2}
							data-groupname={group.name}
							className={`home-channel__group-toggle--${group.key}`}
							onClick={this.toggleExpandGroup}
						>
							<rendition.Flex style={{
								width: '100%'
							}} justify="space-between">
								{group.name}
								<Icon.default name={`chevron-${isExpanded ? 'up' : 'down'}`}/>
							</rendition.Flex>
						</rendition.Button>

						<div style={{
							display: isExpanded ? 'block' : 'none'
						}}>
							{_.map(group.views, (card) => {
								// A view shouldn't be able to display itself
								if (card.id === head.id) {
									return null
								}
								const isActive = card.id === _.get(activeChannel, [ 'data', 'target' ])
								const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ])
								const update = this.props.viewNotices[card.id]
								return (
									<ViewLink.ViewLink
										key={card.id}
										card={card}
										isActive={isActive}
										activeSlice={activeSlice}
										update={update}
										open={this.open}
									/>
								)
							})}
						</div>
					</React.Fragment>)
				})}

			</rendition.Box>
			<rendition.Link p={2} fontSize={1} onClick={this.showChangelog}>
				<rendition.Txt monospace>
						v{this.props.version} {this.props.codename}
				</rendition.Txt>
			</rendition.Link>

			{this.state.showChangelog && (
				<rendition.Modal done={this.hideChangelog}>
					<Markdown.Markdown>{this.props.changelog || ''}</Markdown.Markdown>
				</rendition.Modal>
			)}

		</rendition.Flex>)
	}
}
const mapStateToProps = (state) => {
	return {
		changelog: store.selectors.getChangelog(state),
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
exports.HomeChannel = connect(mapStateToProps, mapDispatchToProps)(HomeChannelBase)
