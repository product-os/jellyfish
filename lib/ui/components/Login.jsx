/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const {
	actionCreators
} = require('../core')
const TopBar = require('./TopBar')
const Icon = require('../shame/Icon')

class Base extends React.Component {
	constructor (props) {
		super(props)

		this.login = (event) => {
			event.preventDefault()
			const {
				username, password
			} = this.state
			this.setState({
				loggingIn: true
			})
			return Bluebird.try(() => {
				return this.props.actions.login({
					username,
					password
				})
			})
				.catch((error) => {
					this.setState({
						loggingIn: false
					})
					this.props.actions.addNotification('danger', error.message || error)
				})
		}
		this.togglePasswordVisibility = (event) => {
			event.preventDefault()
			this.setState({
				showPassword: !this.state.showPassword
			})
		}
		this.handleEmailChange = (event) => {
			this.setState({
				email: event.target.value
			})
		}
		this.handleUsernameChange = (event) => {
			this.setState({
				username: event.target.value
			})
		}
		this.handlePasswordChange = (event) => {
			this.setState({
				password: event.target.value
			})
		}
		this.handlePasswordConfirmationChange = (event) => {
			this.setState({
				passwordConfirmation: event.target.value
			})
		}
		this.state = {
			username: '',
			password: '',
			passwordConfirmation: '',
			showPassword: false,
			email: '',
			loggingIn: false
		}
	}
	render () {
		const {
			username, password, loggingIn
		} = this.state

		return (
			<React.Fragment>
				<TopBar.default>
					<rendition.Img
						width={70}
						style={{
							height: 70
						}}
						pl={2}
						p={10}
						src="/icons/jellyfish.svg"
					/>
				</TopBar.default>

				<rendition.Container mt={4} className="login-page">
					<rendition.Box className="login-page__login" mx="auto" style={{
						maxWidth: 470
					}}>
						<rendition.Txt align="center" mb={4}>
							<rendition.Heading.h2 mb={2}>Log in to Jellyfish</rendition.Heading.h2>
							<span>Enter your details below</span>
						</rendition.Txt>

						<rendition.Divider color="#eee" mb={4}/>

						<form onSubmit={this.login}>
							<rendition.Txt fontSize={1} mb={1}>Username</rendition.Txt>
							<rendition.Input
								className="login-page__input--username"
								mb={5}
								width="100%"
								emphasized={true}
								placeholder="Username"
								value={username}
								onChange={this.handleUsernameChange}
							/>

							<rendition.Txt fontSize={1} mb={1}>Password</rendition.Txt>
							<rendition.Input
								className="login-page__input--password"
								mb={5}
								width="100%"
								emphasized={true}
								placeholder="Password"
								type="password"
								value={password}
								onChange={this.handlePasswordChange}
							/>

							<rendition.Box>
								<rendition.Button
									className="login-page__submit--login"
									width="100%"
									primary={true}
									emphasized={true}
									type="submit"
									disabled={!username || !password || loggingIn}
								>
									{loggingIn ? <Icon.default spin name="cog"/> : 'Log in'}
								</rendition.Button>
							</rendition.Box>
						</form>
					</rendition.Box>
				</rendition.Container>
			</React.Fragment>
		)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addNotification: redux.bindActionCreators(actionCreators.addNotification, dispatch),
			login: redux.bindActionCreators(actionCreators.login, dispatch)
		}
	}
}
exports.Login = connect(null, mapDispatchToProps)(Base)
