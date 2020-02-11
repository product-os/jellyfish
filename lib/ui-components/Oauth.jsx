/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import queryString from 'query-string'
import React from 'react'
import {
	Box
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import Icon from './shame/Icon'

export default class Oauth extends React.Component {
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
