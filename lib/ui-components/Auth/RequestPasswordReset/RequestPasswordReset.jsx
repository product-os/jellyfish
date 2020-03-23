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
			email: '',
			requestingPasswordReset: false
		}

		this.handleEmailChange = this.handleEmailChange.bind(this)
		this.requestPasswordReset = this.requestPasswordReset.bind(this)
	}

	handleEmailChange (event) {
		this.setState({
			email: event.target.value
		})
	}

	requestPasswordReset (event) {
		event.preventDefault()
		const {
			email
		} = this.state

		this.setState({
			requestingPasswordReset: true
		})

		this.props.actions.requestPasswordReset({
			email
		})
			.then(() => {
				this.props.actions.addNotification('success', `Thanks! Please check ${email} for a link to reset your password`)
			})
			.catch(() => {
				this.props.actions.addNotification('danger',
					`Whoops! Something went wrong while trying to request a password reset for email ${email}`)
			})
			.finally(() => {
				this.setState({
					requestingPasswordReset: false
				})
			})
	}

	render () {
		const {
			email,
			requestingPasswordReset
		} = this.state

		return (
			<React.Fragment>
				<Txt align="center" mb={4}>
					<Heading.h2 mb={2}>Request a password reset</Heading.h2>
					<span>Enter your email below</span>
				</Txt>

				<Divider color="#eee" mb={4}/>

				<form
					onSubmit={this.requestPasswordReset}
					data-test="requestPasswordReset-page__form"
				>
					<Txt fontSize={1} mb={1}>Email</Txt>
					<Input
						data-test="requestPasswordReset-page__email"
						mb={5}
						width="100%"
						emphasized={true}
						placeholder="Email"
						value={email}
						onChange={this.handleEmailChange}
					/>
					<Box>
						<Button
							data-test="requestPasswordReset-page__submit"
							width="100%"
							primary={true}
							emphasized={true}
							type="submit"
							disabled={!email || requestingPasswordReset}
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
