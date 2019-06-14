/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	connect
} from 'react-redux'
import {
	Flex,
	Provider
} from 'rendition'
import HomeChannel from './components/HomeChannel'
import Login from './components/Login'
import {
	Notifications
} from './components/Notifications'
import RouteHandler from './components/RouteHandler'
import Splash from './components/Splash'
import {
	selectors
} from './core'
import {
	DragDropContext
} from 'react-dnd'
import ReactDndHtml5Backend from 'react-dnd-html5-backend'
import {
	BrowserRouter as Router,
	Route,
	Redirect
} from 'react-router-dom'

// Register the mermaid and markdown widgets for rendition forms
require('rendition/dist/extra/Form/markdown')
require('rendition/dist/extra/Form/mermaid')

// Check if the path begins with a hash fragment, followed by a slash: /#/
const LEGACY_PATH_CHECK_RE = /^\/#\//
const isLegacyPath = (path) => {
	if (path.match(LEGACY_PATH_CHECK_RE)) {
		return true
	}

	return false
}

// Removes # fragment prefix and type prefixes for a url path
const LEGACY_PATH_REPLACE_RE = /(^\/#\/|[a-z-]+~)/g
const transformLegacyPath = (path) => {
	return path.replace(LEGACY_PATH_REPLACE_RE, '')
}

class JellyfishUI extends React.Component {
	render () {
		const path = window.location.pathname + window.location.hash

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
		const [ home ] = this.props.channels

		return (
			<Provider
				style={{
					height: '100%',
					fontSize: 14
				}}
			>
				<Router>
					{isLegacyPath(path) && (
						<Redirect to={transformLegacyPath(path)} />
					)}

					<Flex flex="1" style={{
						height: '100%'
					}}>
						<HomeChannel channel={home}/>

						<Route path="/*" component={RouteHandler} />
					</Flex>

					<Notifications />
				</Router>
			</Provider>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state)
	}
}

export default DragDropContext(ReactDndHtml5Backend)(connect(mapStateToProps)(JellyfishUI))
