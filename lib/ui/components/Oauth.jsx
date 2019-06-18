/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import queryString from 'query-string'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Box
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import Icon from '../shame/Icon'
import {
	actionCreators,
	selectors
} from '../core'

class Oauth extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			authError: null
		}
	}

	componentDidMount () {
		const {
			actions,
			user,
			match,
			location,
			history
		} = this.props
		const integration = match.params.integration
		const {
			code
		} = queryString.parse(location.search)

		actions.authorizeIntegration(user, integration, code)
			.then(() => {
				history.push(`/${user.slug}`)
			})
			.catch((error) => {
				console.error(error)
				this.setState({
					authError: error
				})
			})
	}

	render () {
		const {
			authError
		} = this.state

		if (authError) {
			return (
				<Box p={3}>
					An error occurred:
					<Markdown>
						{`\`\`\`\n${authError.message || authError}\n\`\`\``}
					</Markdown>
				</Box>
			)
		}

		return (
			<Box p={3}>
				<Icon name="cog" spin /> Authorizing...
			</Box>
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
				'authorizeIntegration',
				'setChannels'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Oauth)
