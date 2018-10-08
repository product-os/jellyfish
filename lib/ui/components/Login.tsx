import * as Bluebird from 'bluebird';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Alert,
	Box,
	Button,
	Container,
	Divider,
	Flex,
	Heading,
	Img,
	Input,
	Link,
	Txt,
} from 'rendition';
import { actionCreators } from '../core/store';
import Icon from './Icon';
import TopBar from './TopBar';

interface LoginProps {
	actions: typeof actionCreators;
}

interface LoginState {
	showSignup: boolean;
	username: string;
	password: string;
	passwordConfirmation: string;
	showPassword: boolean;
	email: string;
	loggingIn: boolean;
	signupError: string;
	loginError: string;
}

class Base extends React.Component<LoginProps, LoginState> {
	constructor(props: LoginProps) {
		super(props);

		this.state = {
			showSignup: false,
			username: '',
			password: '',
			passwordConfirmation: '',
			showPassword: false,
			email: '',
			loggingIn: false,
			signupError: '',
			loginError: '',
		};
	}

	public signup = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLElement>) => {
		e.preventDefault();
		const { username, password, email } = this.state;
		this.setState({
			loggingIn: true,
			signupError: '',
		});

		Bluebird.try(() => this.props.actions.signup({
			username,
			password,
			email,
		}))
		.catch((e: Error) => {
			this.setState({
				signupError: e.message,
				loggingIn: false,
			});
		});
	}

	public login = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLElement>) => {
		e.preventDefault();
		const { username, password } = this.state;
		this.setState({ loggingIn: true });

		return Bluebird.try(() => this.props.actions.login({
			username,
			password,
		}))
		.catch((e: Error) => {
			this.setState({
				loginError: e.message,
				loggingIn: false,
			});
		});
	}

	public toggleSignup = () => {
		this.setState({ showSignup: !this.state.showSignup });
	}

	public togglePasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		this.setState({ showPassword: !this.state.showPassword });
	}

	public handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ email: e.target.value });
	}

	public handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ username: e.target.value });
	}

	public handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ password: e.target.value });
	}

	public handlePasswordConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ passwordConfirmation: e.target.value });
	}

	public render(): React.ReactNode {
		const {
			email,
			username,
			password,
			passwordConfirmation,
			loggingIn,
		} = this.state;

		const signupDisabled = !email || !username || !password || loggingIn || password !== passwordConfirmation;

		return (
			<React.Fragment>
				<TopBar>
					<Img w={70} pl={2} p={10} src="/icons/jellyfish.svg" />

					<Button
						className="login-signup-toggle"
						mr={3}
						onClick={this.toggleSignup}
					>
						{this.state.showSignup ? 'Log in' : 'Sign up'}
					</Button>
				</TopBar>

				<Container mt={4} className="login-page">
					<Box
						className={this.state.showSignup ? 'login-page__signup' : 'login-page__login'}
						mx="auto"
						style={{maxWidth: 470}}
					>
						{this.state.showSignup &&
							<React.Fragment>
								<Txt align="center" mb={4} >
									<Heading.h2 mb={2}>Sign up to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Txt>

								<Divider color="#eee" mb={4} />

								{this.state.signupError &&
									<Alert danger={true} mb={3}>{this.state.signupError}</Alert>
								}

								<form onSubmit={this.signup}>
									<Txt fontSize={1} mb={1}>Email</Txt>
									<Input
										className="login-page__input--email"
										mb={5}
										w="100%"
										emphasized={true}
										type="email"
										placeholder="Email"
										value={this.state.email}
										onChange={this.handleEmailChange}
									/>

									<Txt fontSize={1} mb={1}>Username</Txt>
									<Input
										className="login-page__input--username"
										mb={5}
										w="100%"
										emphasized={true}
										placeholder="Username"
										value={this.state.username}
										onChange={this.handleUsernameChange}
									/>


									<Flex mb={5}>
										<Box mr={3} flex="1">
											<Txt fontSize={1} mb={1}>Password</Txt>
											<Input
												className="login-page__input--password"
												w="100%"
												emphasized={true}
												placeholder="Password"
												type={this.state.showPassword ? 'test' : 'password'}
												value={this.state.password}
												onChange={this.handlePasswordChange}
											/>
										</Box>

										<Box mr={2} flex="1">
											<Txt fontSize={1} mb={1}>Confirm password</Txt>
											<Input
												className="login-page__input--confirm-password"
												w="100%"
												emphasized={true}
												placeholder="Confirm password"
												type={this.state.showPassword ? 'test' : 'password'}
												value={this.state.passwordConfirmation}
												onChange={this.handlePasswordConfirmationChange}
											/>
										</Box>

										<Button
											square
											plaintext
											mt={20}
											onClick={this.togglePasswordVisibility}
										>
											<Icon name={this.state.showPassword ? 'eye' : 'eye-slash'} />
										</Button>
									</Flex>

									<Box>
										<Button
											className="login-page__submit--signup"
											w="100%"
											primary={true}
											emphasized={true}
											disabled={signupDisabled}
											onClick={this.signup}
										>
											{this.state.loggingIn ? <Icon name="cog fa-spin" /> : 'Sign up'}
										</Button>
									</Box>
									<Txt color="#908c99" fontSize={0} my={4} align="center">
										By clicking "Sign up" you confirm that you have performed the
										<Link blank={true} href="https://bosshamster.deviantart.com/art/Summoning-Cthulhu-For-Dummies-31645860">initiation rituals</Link>
									</Txt>
								</form>
							</React.Fragment>
						}

						{!this.state.showSignup &&
							<React.Fragment>
								<Txt align="center" mb={4} >
									<Heading.h2 mb={2}>Log in to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Txt>

								<Divider color="#eee" mb={4} />

								{this.state.loginError &&
									<Alert danger={true} mb={3}>{this.state.loginError}</Alert>
								}

								<form onSubmit={this.login}>
									<Txt fontSize={1} mb={1}>Username</Txt>
									<Input
										className="login-page__input--username"
										mb={5}
										w="100%"
										emphasized={true}
										placeholder="Username"
										value={this.state.username}
										onChange={this.handleUsernameChange}
									/>

									<Txt fontSize={1} mb={1}>Password</Txt>
									<Input
										className="login-page__input--password"
										mb={5}
										w="100%"
										emphasized={true}
										placeholder="Password"
										type="password"
										value={this.state.password}
										onChange={this.handlePasswordChange}
									/>

									<Box>
										<Button
											className="login-page__submit--login"
											w="100%"
											primary={true}
											emphasized={true}
											disabled={!this.state.username || !this.state.password || this.state.loggingIn}
											onClick={this.login}
										>
											{this.state.loggingIn ? <Icon name="cog fa-spin" /> : 'Log in'}
										</Button>
									</Box>
								</form>
							</React.Fragment>
						}
					</Box>
				</Container>
			</React.Fragment>
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const Login = connect(null, mapDispatchToProps)(Base);
