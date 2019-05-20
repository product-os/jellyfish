/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	Flex,
	Provider
} from 'rendition'
import ChannelRenderer from './components/ChannelRenderer'
import HomeChannel from './components/HomeChannel'
import {
	Login
} from './components/Login'
import {
	Notifications
} from './components/Notifications'
import Splash from './components/Splash'
import {
	selectors
} from './core'
import {
	DragDropContext
} from 'react-dnd'
import ReactDndHtml5Backend from 'react-dnd-html5-backend'
import ReactResizeObserver from 'react-resize-observer'

// Register the mermaid and markdown widgets for rendition forms
require('rendition/dist/extra/Form/markdown')
require('rendition/dist/extra/Form/mermaid')

class UI extends React.Component {
	constructor () {
		super()

		this.state = {
			spaces: []
		}

		this.handleResize = this.handleResize.bind(this)
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

	componentWillReceiveProps (nextProps) {
		this.calcWidth(nextProps.channels)
	}

	handleResize () {
		this.calcWidth(this.props.channels)
	}

	render () {
		if (this.props.status === 'initializing') {
			return <Splash.Splash />
		}
		if (this.props.status === 'unauthorized') {
			return (
				<Provider>
					<Login />
					<Notifications />
				</Provider>
			)
		}
		const [ home, ...rest ] = this.props.channels

		const {
			spaces
		} = this.state

		const user = this.props.user
		const userHasOrg = Boolean(user) && _.get(user, [ 'linked_at', 'is member of' ])

		return (
			<Provider
				style={{
					height: '100%',
					fontSize: 14
				}}
			>
				<ReactResizeObserver onResize={this.handleResize}/>

				<Flex flex="1" style={{
					height: '100%'
				}}>
					<HomeChannel channel={home}/>

					{(!rest.length && !userHasOrg) && (
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
					{_.map(rest, (channel, index) => {
						return (
							<ChannelRenderer.default
								user={user}
								key={channel.id}
								channel={channel}
								space={spaces[index]}
							/>
						)
					})}
				</Flex>

				<Notifications />
			</Provider>
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
export default DragDropContext(ReactDndHtml5Backend)(connect(mapStateToProps)(UI))
