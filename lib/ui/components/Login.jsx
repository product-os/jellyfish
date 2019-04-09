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
const store = require('../core/store')
const TopBar = require('./TopBar')
const Icon = require('../shame/Icon')
class Base extends React.Component {
	constructor (props) {
		super(props)
		this.signup = (event) => {
			event.preventDefault()
			const {
				username, password, email
			} = this.state
			this.setState({
				loggingIn: true,
				signupError: ''
			})
			Bluebird.try(() => {
				return this.props.actions.signup({
					username,
					password,
					email
				})
			})
				.catch((error) => {
					this.setState({
						signupError: error.message,
						loggingIn: false
					})
				})
		}
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
						loginError: error.message,
						loggingIn: false
					})
				})
		}
		this.toggleSignup = () => {
			this.setState({
				showSignup: !this.state.showSignup
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
			showSignup: false,
			username: '',
			password: '',
			passwordConfirmation: '',
			showPassword: false,
			email: '',
			loggingIn: false,
			signupError: '',
			loginError: ''
		}
	}
	render () {
		const {
			email, username, password, passwordConfirmation, loggingIn
		} = this.state
		const signupDisabled = !email || !username || !password || loggingIn || password !== passwordConfirmation
		return (<React.Fragment>
			<TopBar.default>
				<rendition.Img w={70} pl={2} p={10} src="/icons/jellyfish.svg"/>
			</TopBar.default>

			<rendition.Container mt={4} className="login-page">
				<rendition.Box className={this.state.showSignup ? 'login-page__signup' : 'login-page__login'} mx="auto" style={{
					maxWidth: 470
				}}>
					{this.state.showSignup && (
						<React.Fragment>
							<rendition.Txt align="center" mb={4}>
								<rendition.Heading.h2 mb={2}>Sign up to Jellyfish</rendition.Heading.h2>
								<span>Enter your details below</span>
							</rendition.Txt>

							<rendition.Divider color="#eee" mb={4}/>

							{this.state.signupError &&
								<rendition.Alert danger={true} mb={3}>{this.state.signupError}</rendition.Alert>}

							<form onSubmit={this.signup}>
								<rendition.Txt fontSize={1} mb={1}>Email</rendition.Txt>
								<rendition.Input
									className="login-page__input--email"
									mb={5}
									w="100%"
									emphasized={true}
									type="email"
									placeholder="Email"
									value={this.state.email}
									onChange={this.handleEmailChange}
								/>

								<rendition.Txt fontSize={1} mb={1}>Username</rendition.Txt>
								<rendition.Input
									className="login-page__input--username"
									mb={5}
									w="100%"
									emphasized={true}
									placeholder="Username"
									value={this.state.username}
									onChange={this.handleUsernameChange}
								/>

								<rendition.Flex mb={5}>
									<rendition.Box mr={3} flex="1">
										<rendition.Txt fontSize={1} mb={1}>Password</rendition.Txt>
										<rendition.Input
											className="login-page__input--password"
											w="100%"
											emphasized={true}
											placeholder="Password"
											type={this.state.showPassword ? 'text' : 'password'}
											value={this.state.password}
											onChange={this.handlePasswordChange}
										/>
									</rendition.Box>

									<rendition.Box mr={2} flex="1">
										<rendition.Txt fontSize={1} mb={1}>Confirm password</rendition.Txt>
										<rendition.Input
											className="login-page__input--confirm-password"
											w="100%"
											emphasized={true}
											placeholder="Confirm
											password"
											type={this.state.showPassword ? 'test' : 'password'}
											value={this.state.passwordConfirmation}
											onChange={this.handlePasswordConfirmationChange}
										/>
									</rendition.Box>

									<rendition.Button
										square
										plaintext
										mt={20}
										type="button"
										onClick={this.togglePasswordVisibility}
									>
										<Icon.default name={this.state.showPassword ? 'eye' : 'eye-slash'}/>
									</rendition.Button>
								</rendition.Flex>

								<rendition.Box>
									<rendition.Button
										className="login-page__submit--signup"
										w="100%"
										primary={true}
										emphasized={true}
										disabled={signupDisabled}
										onClick={this.signup}
									>
										{this.state.loggingIn ? <Icon.default spin name="cog"/> : 'Sign up'}
									</rendition.Button>
								</rendition.Box>
								<rendition.Txt color="#908c99" fontSize={0} my={4} align="center">
									By clicking &#34;Sign up&#34; you confirm that you have performed the
									<rendition.Link
										ml={1}
										blank={true}
										href="https://bosshamster.deviantart.com/art/Summoning-Cthulhu-For-Dummies-31645860"
									>
										initiation rituals
									</rendition.Link>
								</rendition.Txt>
							</form>
						</React.Fragment>
					)}

					{!this.state.showSignup && (
						<React.Fragment>
							<rendition.Txt align="center" mb={4}>
								<rendition.Heading.h2 mb={2}>Log in to Jellyfish</rendition.Heading.h2>
								<span>Enter your details below</span>
							</rendition.Txt>

							<rendition.Divider color="#eee" mb={4}/>

							{this.state.loginError &&
								<rendition.Alert danger={true} mb={3}>{this.state.loginError}</rendition.Alert>}

							<form onSubmit={this.login}>
								<rendition.Txt fontSize={1} mb={1}>Username</rendition.Txt>
								<rendition.Input
									className="login-page__input--username"
									mb={5}
									w="100%"
									emphasized={true}
									placeholder="Username"
									value={this.state.username}
									onChange={this.handleUsernameChange}
								/>

								<rendition.Txt fontSize={1} mb={1}>Password</rendition.Txt>
								<rendition.Input
									className="login-page__input--password"
									mb={5}
									w="100%"
									emphasized={true}
									placeholder="Password"
									type="password"
									value={this.state.password}
									onChange={this.handlePasswordChange}
								/>

								<rendition.Box>
									<rendition.Button
										className="login-page__submit--login"
										w="100%"
										primary={true}
										emphasized={true}
										disabled={!this.state.username || !this.state.password || this.state.loggingIn}
										onClick={this.login}
									>
										{this.state.loggingIn ? <Icon.default spin name="cog"/> : 'Log in'}
									</rendition.Button>
								</rendition.Box>
							</form>
						</React.Fragment>
					)}
				</rendition.Box>
			</rendition.Container>
		</React.Fragment>)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
exports.Login = connect(null, mapDispatchToProps)(Base)
