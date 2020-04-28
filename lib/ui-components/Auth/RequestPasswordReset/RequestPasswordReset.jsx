/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Box,
	Button,
	Divider,
	Heading,
	Input,
	Link,
	Txt
} from 'rendition'
import Icon from '../../shame/Icon'

const StyledLink = styled(Link) `
	float: right;
`

export default class RequestPasswordReset extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			username: '',
			requestingPasswordReset: false
		}

		this.handleUsernameChange = this.handleUsernameChange.bind(this)
		this.requestPasswordReset = this.requestPasswordReset.bind(this)
	}

	handleUsernameChange (event) {
		this.setState({
			username: event.target.value
		})
	}

	requestPasswordReset (event) {
		event.preventDefault()
		const {
			username
		} = this.state

		this.setState({
			requestingPasswordReset: true
		})

		this.props.actions.requestPasswordReset({
			username
		})
			.then(() => {
				this.props.actions.addNotification('success', 'Thanks! Please check your email for a link to reset your password')
			})
			.catch(() => {
				this.props.actions.addNotification('danger',
					`Whoops! Something went wrong while trying to request a password reset for username ${username}`)
			})
			.finally(() => {
				this.setState({
					requestingPasswordReset: false
				})
			})
	}

	render () {
		const {
			username,
			requestingPasswordReset
		} = this.state

		return (
			<React.Fragment>
				<Txt align="center" mb={4}>
					<Heading.h2 mb={2}>Request a password reset</Heading.h2>
					<span>Enter your username below</span>
				</Txt>

				<Divider color="#eee" mb={4}/>

				<form
					onSubmit={this.requestPasswordReset}
					data-test="requestPasswordReset-page__form"
				>
					<Txt fontSize={1} mb={1}>Username</Txt>
					<Input
						data-test="requestPasswordReset-page__username"
						mb={5}
						width="100%"
						emphasized={true}
						placeholder="Username"
						autoComplete="username"
						value={username}
						onChange={this.handleUsernameChange}
					/>
					<Box>
						<Button
							data-test="requestPasswordReset-page__submit"
							width="100%"
							primary={true}
							emphasized={true}
							type="submit"
							disabled={!username || requestingPasswordReset}
						>
							{requestingPasswordReset ? <Icon spin name="cog"/> : 'Submit'}
						</Button>
					</Box>
				</form>
				<StyledLink
					mt={3}
					href="/"
				>
					Return to login?
				</StyledLink>
			</React.Fragment>
		)
	}
}
