/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	deepEqual
} from 'fast-equals'
import React from 'react'
import {
	connect
} from 'react-redux'
import ReactResizeObserver from 'react-resize-observer'
import {
	bindActionCreators
} from 'redux'
import {
	Flex
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../core'
import ChannelRenderer from '../ChannelRenderer'

const PATH_SEPARATOR = '...'

class RouteHandler extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			spaces: []
		}

		this.handleResize = this.handleResize.bind(this)
	}

	componentDidMount () {
		this.setChannelsFromPath()
	}

	componentWillReceiveProps (nextProps) {
		this.calcWidth(nextProps.channels)
	}

	componentDidUpdate (nextProps) {
		if (nextProps.location.pathname !== this.props.location.pathname) {
			this.setChannelsFromPath()
		}
	}

	// Space allocation algorithm is as follows:
	// 1. Get the inner width of the window
	// 2. Deduct the width of the sidebar
	// 3. For all but the last two channels set their width to 50px, deducting
	//    the total of their widths from the window
	// 4. For the last two channels split the remaining window width in a 1:2
	//    ratio
	calcWidth (channels) {
		const sidebarWidth = 180
		const squishedWidth = 24
		const channelMinWidth = 300

		if (!channels) {
			return
		}

		const channelsToRender = channels.length - 1
		const squished = channelsToRender - 2

		const spaces = []

		if (squished > 0) {
			for (let item = 0; item < squished; item++) {
				spaces.push({
					left: sidebarWidth + item * squishedWidth,
					width: channelMinWidth
				})
			}
		}

		const width = window.innerWidth - sidebarWidth - Math.max(squished * squishedWidth, 0)

		if (channels.length === 2) {
			spaces.push({
				left: sidebarWidth + Math.max(squished * squishedWidth, 0),
				width
			})
		} else {
			spaces.push({
				left: sidebarWidth + Math.max(squished * squishedWidth, 0),
				width: width / 3
			})

			spaces.push({
				left: sidebarWidth + Math.max(squished * squishedWidth, 0) + width / 3,
				width: width / 3 * 2
			})
		}

		this.setState({
			spaces
		})
	}

	handleResize () {
		this.calcWidth(this.props.channels)
	}

	setChannelsFromPath () {
		const path = this.props.location.pathname
		const targets = _.compact(_.trim(path, '/').split('/'))
		const {
			channels
		} = this.props
		const homeChannel = _.first(channels)
		const newChannels = targets.map((piece) => {
			const [ target, slice ] = piece.split(PATH_SEPARATOR)
			const options = {}

			if (slice) {
				const parts = slice.split('+is+')
				const slicePath = parts[0]
				const sliceValue = decodeURIComponent(parts[1])

				options.slice = {
					path: slicePath,
					value: sliceValue
				}
			}

			const existingChannel = _.find(channels, [ 'data.target', target ])

			// If there is already a channel loaded with the same ID and options, just re-use it
			if (existingChannel && deepEqual(existingChannel.data.options, options)) {
				return existingChannel
			}

			return {
				target,
				options
			}
		})

		const payload = _.compact([ homeChannel, ...newChannels ])

		this.props.actions.setChannels(payload)
	}

	render () {
		const {
			channels,
			user
		} = this.props
		const {
			spaces
		} = this.state
		const userHasOrg = Boolean(user) && _.get(user, [ 'linked_at', 'is member of' ])

		return (
			<React.Fragment>
				<ReactResizeObserver onResize={this.handleResize}/>

				{(!channels.slice(1).length && !userHasOrg) && (
					<Flex
						flex="1"
						justifyContent="center"
						pt="20%"
					>
						<p
							style={{
								textAlign: 'center'
							}}
						>
							Looks like you are not part of an organisation yet.<br/>
							Contact your friendly Jellyfish administrator for assistance.
						</p>
					</Flex>
				)}

				{_.map(channels.slice(1), (channel, index) => {
					return (
						<ChannelRenderer.default
							user={user}
							key={channel.id}
							channel={channel}
							space={spaces[index]}
						/>
					)
				})}
			</React.Fragment>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'setChannels'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(RouteHandler)
