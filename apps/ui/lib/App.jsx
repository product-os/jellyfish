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
	bindActionCreators
} from 'redux'
import {
	Form,
	Rating
} from 'rendition'
import {
	MarkdownWidget
} from 'rendition/dist/extra/Form/markdown'
import {
	createClient, createNoopClient, createWebTracker
} from 'analytics-client'
import {
	saveAs
} from 'file-saver'
import MermaidEditor from './components/MermaidEditor'
import Splash from './components/Splash'
import {
	actionCreators,
	selectors
} from './core'
import {
	useLocation,
	Redirect
} from 'react-router-dom'
import {
	isProduction
} from './environment'
import {
	useLens
} from './hooks'

// Register the mermaid and markdown widgets for rendition forms
// Register the extra format widgets to the Form component
Form.registerWidget('markdown', MarkdownWidget)
Form.registerWidget('mermaid', MermaidEditor)
Form.registerWidget('Rating', Rating)

// Check if the path begins with a hash fragment, followed by a slash: /#/ OR
// A path that begins with a type and a tilde
const LEGACY_PATH_CHECK_RE = /^\/(#\/|[a-z-].+~)/
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

const analyticsClient = isProduction()
	? createClient({
		endpoint: 'data.balena-cloud.com',
		projectName: 'jellyfish',
		componentName: 'jellyfish-ui'
	})
	: createNoopClient(false)

const webTracker = createWebTracker(analyticsClient, 'UI')

const App = ({
	actions,
	currentUser,
	status
}) => {
	const lens = useLens(currentUser, 'misc')
	const location = useLocation()

	React.useEffect(() => {
		webTracker.trackPageView()
	}, [ location.pathname ])

	React.useEffect(() => {
		// Add a utility to the window to dump the core state, this is useful for
		// debugging
		window.dumpState = async () => {
			const state = await actions.dumpState()

			const blob = new Blob(
				[ JSON.stringify(state) ],
				{
					type: 'application/json;charset=utf-8'
				}
			)

			saveAs(blob, `jellyfish-ui-dump__${new Date().toISOString()}.json`)
		}
	}, [])

	const path = window.location.pathname + window.location.hash

	if (isLegacyPath(path)) {
		return (
			<Redirect to={transformLegacyPath(path)} />
		)
	}

	if (status === 'initializing' || !currentUser) {
		return <Splash />
	}

	return (
		<lens.data.renderer card={currentUser}/>
	)
}

const mapStateToProps = (state) => {
	return {
		currentUser: selectors.getCurrentUser(state),
		status: selectors.getStatus(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'dumpState'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
