/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Button,
	Divider,
	Heading,
	Input,
	Txt
} from 'rendition'
import Icon from '../../shame/Icon'

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
			<div className='login-page'>
				<Txt align="center" mb={4}>
					<Heading.h2 mb={2}>Login to Jellyfish</Heading.h2>
					<span>Enter your details below</span>
				</Txt>

				<Divider color="#eee" mb={4}/>

				<form onSubmit={this.login}>
					<Txt fontSize={1} mb={1}>Username</Txt>
					<Input
						className="login-page__input--username"
						mb={5}
						width="100%"
						emphasized={true}
						placeholder="Username"
						value={username}
						onChange={this.handleUsernameChange}
					/>

					<Txt fontSize={1} mb={1}>Password</Txt>
					<Input
						className="login-page__input--password"
						mb={5}
						width="100%"
						emphasized={true}
						placeholder="Password"
						type="password"
						value={password}
						onChange={this.handlePasswordChange}
					/>

					<Box>
						<Button
							className="login-page__submit--login"
							width="100%"
							primary={true}
							emphasized={true}
							type="submit"
							disabled={!username || !password || loggingIn}
						>
							{loggingIn ? <Icon spin name="cog"/> : 'Log in'}
						</Button>
					</Box>
				</form>
			</div>
		)
	}
}
