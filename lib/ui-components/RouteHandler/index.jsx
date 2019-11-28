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
import {
	bindActionCreators
} from 'redux'
import {
	Flex
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../../apps/ui/core'
import ChannelRenderer from '../ChannelRenderer'

const PATH_SEPARATOR = '...'

class RouteHandler extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			spaces: []
		}
	}

	componentDidMount () {
		this.setChannelsFromPath()
	}

	componentDidUpdate (nextProps) {
		if (nextProps.location.pathname !== this.props.location.pathname) {
			this.setChannelsFromPath()
		}
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

			return {
				target,
				options
			}
		})

		const payload = _.compact([ homeChannel, ...newChannels ])

		this.props.actions.setChannels(payload)
	}

	calcWidth (index) {
		// Space allocation algorithm is as follows:
		// 1. For all but the last two channels set their width to 50px
		// 2. For the last two channels split the remaining window width in a 1:2
		//    ratio
		const allChannels = this.props.channels.slice(1).length
		let channelWidth = '50px'

		if (index === allChannels - 1) {
			channelWidth = '100%'
		} else if (index === allChannels - 2) {
			channelWidth = '50%'
		}

		return channelWidth
	}

	render () {
		const {
			channels,
			user
		} = this.props
		const userHasOrg = Boolean(user) && _.get(user, [ 'linked_at', 'is member of' ])

		return (
			<React.Fragment>
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

				<Flex flex="1">
					{_.map(channels.slice(1), (channel, index) => {
						return (
							<ChannelRenderer
								user={user}
								key={channel.id}
								channel={channel}
								width={this.calcWidth(index)}
							/>
						)
					})}
				</Flex>
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
