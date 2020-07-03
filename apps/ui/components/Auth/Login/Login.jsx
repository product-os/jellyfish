/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import Icon from '../../../../../lib/ui-components/shame/Icon'
import {
	AuthCard, AuthHeading, AuthForm, AuthField, AuthButton, AuthLink
} from '../AuthUtil'

export default class Login extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			username: '',
			password: '',
			loggingIn: false
		}

		this.handlePasswordChange = this.handlePasswordChange.bind(this)
		this.handleUsernameChange = this.handleUsernameChange.bind(this)
		this.login = this.login.bind(this)
	}

	handleUsernameChange (event) {
		this.setState({
			username: event.target.value
		})
	}

	handlePasswordChange (event) {
		this.setState({
			password: event.target.value
		})
	}

	login (event) {
		event.preventDefault()
		const {
			username, password
		} = this.state

		this.setState({
			loggingIn: true
		})

		return this.props.actions.login({
			username,
			password
		})
			.catch((error) => {
				this.setState({
					loggingIn: false
				})
				this.props.actions.addNotification('danger', error.message || error)
			})
	}

	render () {
		const {
			username, password, loggingIn
		} = this.state

		return (
			<AuthCard className='login-page'>
				<AuthHeading title="Login to Jellyfish" subtitle="Enter your details below" />
				<AuthForm onSubmit={this.login}>
					<AuthField
						tabIndex={1}
						name="username"
						label="Username"
						className="login-page__input--username"
						placeholder="Username"
						autoComplete="username"
						value={username}
						onChange={this.handleUsernameChange}
					/>
					<AuthField
						tabIndex={2}
						name="password"
						label="Password"
						className="login-page__input--password"
						placeholder="Password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={this.handlePasswordChange}
					/>
					<AuthButton
						tabIndex={3}
						className="login-page__submit--login"
						disabled={!username || !password || loggingIn}
					>
						{loggingIn ? <Icon spin name="cog"/> : 'Log in'}
					</AuthButton>
				</AuthForm>
				<AuthLink to="/request_password_reset" tabIndex={4}>Forgot Password?</AuthLink>
			</AuthCard>
		)
	}
}
