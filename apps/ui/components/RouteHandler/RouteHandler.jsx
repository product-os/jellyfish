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
import ReactResizeObserver from 'react-resize-observer'
import {
	Flex
} from 'rendition'
import ChannelRenderer from '../ChannelRenderer'

const PATH_SEPARATOR = '...'

export default class RouteHandler extends React.Component {
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

	// eslint-disable-next-line camelcase
	UNSAFE_componentWillReceiveProps (nextProps) {
		this.calcWidth(nextProps.channels)
	}

	componentDidUpdate (prevProps) {
		if (prevProps.location.pathname !== this.props.location.pathname) {
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
		const squished = channelsToRender - (this.props.isMobile ? 1 : 2)

		const spaces = []

		if (squished > 0) {
			for (let item = 0; item < squished; item++) {
				spaces.push(this.props.isMobile ? {
					left: 0,
					width: 0
				} : {
					left: sidebarWidth + item * squishedWidth,
					width: channelMinWidth
				})
			}
		}

		const width = window.innerWidth - sidebarWidth - Math.max(squished * squishedWidth, 0)

		if (this.props.isMobile) {
			spaces.push({
				left: 0,
				width: window.innerWidth
			})
		} else if (channels.length === 2) {
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
		let path = this.props.location.pathname
		if (path === '/.') {
			path = '/'
		}

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

			// TODO: Remove this special case handling for the inbox and use a generic
			// solution
			if (target === 'inbox') {
				return {
					target: 'inbox',
					canonical: false,
					format: 'inbox',
					head: {},
					options: {}
				}
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
			getLens,
			types,
			actions,
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
						<ChannelRenderer
							getLens={getLens}
							types={types}
							actions={actions}
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
