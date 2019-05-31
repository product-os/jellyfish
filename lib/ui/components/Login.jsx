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
	bindActionCreators
} from 'redux'
import {
	Box,
	Button,
	Container,
	Divider,
	Flex,
	Heading,
	Img,
	Input,
	Txt
} from 'rendition'
import {
	actionCreators
} from '../core'
import Icon from '../shame/Icon'

class Login extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			username: '',
			password: '',
			passwordConfirmation: '',
			showPassword: false,
			email: '',
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
			<React.Fragment>
				<Flex justifyContent="space-between" align="center"
					style={{
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
					}}
				>
					<Img
						width={70}
						style={{
							height: 70
						}}
						pl={2}
						p={10}
						src="/icons/jellyfish.svg"
					/>
				</Flex>

				<Container mt={4} className="login-page">
					<Box className="login-page__login" mx="auto" style={{
						maxWidth: 470
					}}>
						<Txt align="center" mb={4}>
							<Heading.h2 mb={2}>Log in to Jellyfish</Heading.h2>
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
					</Box>
				</Container>
			</React.Fragment>
		)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addNotification: bindActionCreators(actionCreators.addNotification, dispatch),
			login: bindActionCreators(actionCreators.login, dispatch)
		}
	}
}
export default connect(null, mapDispatchToProps)(Login)
