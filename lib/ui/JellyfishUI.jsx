/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const rendition = require('rendition')
const ChannelRenderer = require('./components/ChannelRenderer')
const HomeChannel = require('./components/HomeChannel')
const Login = require('./components/Login')
const Notifications = require('./components/Notifications')
const Splash = require('./components/Splash')
const store = require('./core/store')
const reactDnd = require('react-dnd')
const reactDndHtml5Backend = require('react-dnd-html5-backend')

// Register the mermaid and markdown widgets for rendition forms
require('rendition/dist/extra/Form/markdown')
require('rendition/dist/extra/Form/mermaid')
const calcFlex = (num) => {
	let start = num
	let flex = 1
	while (start--) {
		flex *= 2
	}
	return flex
}
class UI extends React.Component {
	render () {
		if (this.props.status === 'initializing') {
			return <Splash.Splash />
		}
		if (this.props.status === 'unauthorized') {
			return (<rendition.Provider>
				<Login.Login />
				<Notifications.Notifications />
			</rendition.Provider>)
		}
		const [ home, ...rest ] = this.props.channels
		return (<rendition.Provider style={{
			height: '100%',
			fontSize: 14
		}}>
			<rendition.Flex flex="1" style={{
				height: '100%'
			}}>
				<HomeChannel.HomeChannel channel={home}/>

				{_.map(rest, (channel, index) => {
					return (<ChannelRenderer.default key={channel.id} channel={channel} flex={calcFlex(index)}/>)
				})}
			</rendition.Flex>

			<Notifications.Notifications />
		</rendition.Provider>)
	}
}
const mapStateToProps = (state) => {
	return {
		channels: store.selectors.getChannels(state),
		status: store.selectors.getStatus(state)
	}
}
exports.JellyfishUI = reactDnd.DragDropContext(reactDndHtml5Backend.default)(connect(mapStateToProps)(UI))
