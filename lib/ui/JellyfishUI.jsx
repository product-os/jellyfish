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
	Flex,
	Modal,
	Provider,
	Txt
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import {
	MarkdownWidget
} from 'rendition/dist/extra/Form/markdown'
import {
	MermaidWidget
} from 'rendition/dist/extra/Form/mermaid'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	saveAs
} from 'file-saver'
import HomeChannel from '../ui-components/HomeChannel'
import Login from '../ui-components/Login'
import Notifications from '../ui-components/Notifications'
import Oauth from '../ui-components/Oauth'
import RouteHandler from '../ui-components/RouteHandler'
import Splash from '../ui-components/Splash'
import {
	actionCreators,
	selectors
} from './core'
import {
	DragDropContext
} from 'react-dnd'
import ReactDndHtml5Backend from 'react-dnd-html5-backend'
import {
	BrowserRouter as Router,
	Route,
	Redirect,
	Switch
} from 'react-router-dom'

// Register the mermaid and markdown widgets for rendition forms
// Register the extra format widgets to the Form component
Form.registerWidget('markdown', MarkdownWidget)
Form.registerWidget('mermaid', MermaidWidget)

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

class JellyfishUI extends React.Component {
	constructor (props) {
		super(props)

		// Add a utility to the window to dump the core state, this is useful for
		// debugging
		window.dumpState = async () => {
			const state = await this.props.actions.dumpState()

			const blob = new Blob(
				[ JSON.stringify(state) ],
				{
					type: 'application/json;charset=utf-8'
				}
			)

			saveAs(blob, `jellyfish-ui-dump__${new Date().toISOString()}.json`)
		}

		this.state = {
			showChangelog: null
		}

		this.hideChangelog = () => {
			this.setState({
				showChangelog: null
			})
		}
	}

	componentDidUpdate (prevProps) {
		if (prevProps.version && prevProps.version !== this.props.version) {
			this.setState({
				showChangelog: prevProps.version
			})
		}
	}

	render () {
		const path = window.location.pathname + window.location.hash

		if (this.props.status === 'initializing') {
			return <Splash />
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

					{this.state.showChangelog && (
						<Modal
							title={`Whats new in v${this.props.version}`}
							done={this.hideChangelog}
						>
							<Txt pb={3}>There has been a few changes since you were last here:</Txt>
							<Markdown>
								{this.props.changelog.split(`# ${this.state.showChangelog}`)[0]}
							</Markdown>
						</Modal>
					)}

					<Flex flex="1" style={{
						height: '100%'
					}}>
						<HomeChannel channel={home}/>

						<Switch>
							<Route path="/oauth/:integration" component={Oauth} />
							<Route path="/*" component={RouteHandler} />
						</Switch>
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
		status: selectors.getStatus(state),
		version: selectors.getAppVersion(state),
		changelog: selectors.getChangelog(state)
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

export default DragDropContext(ReactDndHtml5Backend)(
	connect(mapStateToProps, mapDispatchToProps)(JellyfishUI)
)
