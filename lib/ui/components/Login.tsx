import * as React from 'react';
import {
	Alert,
	Box,
	Button,
	Container,
	Divider,
	Heading,
	Img,
	Input,
	Link,
	Txt,
} from 'rendition';
import * as sdk from '../services/sdk';
import Icon from './Icon';
import TopBar from './TopBar';

interface LoginState {
	showSignup: boolean;
	username: string;
	password: string;
	email: string;
	loggingIn: boolean;
	signupError: string;
	loginError: string;
}

export default class Login extends React.Component<{}, LoginState> {
	constructor(props: {}) {
		super(props);

		this.state = {
			showSignup: false,
			username: '',
			password: '',
			email: '',
			loggingIn: false,
			signupError: '',
			loginError: '',
		};
	}

	public signup() {
		const { username, password, email } = this.state;
		this.setState({
			loggingIn: true,
			signupError: '',
		});

		sdk.user.signup({
			username,
			password,
			email,
		})
		.catch((e) => {
			this.setState({ signupError: e.message });
		})
		.finally(() => this.setState({ loggingIn: false }));
	}

	public login() {
		const { username, password } = this.state;
		this.setState({ loggingIn: true });

		sdk.user.login({
			username,
			password,
		})
		.catch((e) => {
			this.setState({ loginError: e.message });
		})
		.finally(() => this.setState({ loggingIn: false }));
	}

	public render() {
		return (
			<React.Fragment>
				<TopBar>
					<Img w={70} pl={2} p={10} src='/icons/jellyfish.svg' />

					<Button mr={3} onClick={() => this.setState({ showSignup: !this.state.showSignup })}>
						{this.state.showSignup ? 'Log in' : 'Sign up'}
					</Button>
				</TopBar>
				<Container mt={4}>
					<Box mx='auto' style={{maxWidth: 470}}>
						{this.state.showSignup &&
							<React.Fragment>
								<Txt align='center' mb={4} >
									<Heading.h2 mb={2}>Sign up to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Txt>

								<Divider color='#eee' mb={4} />

								{this.state.signupError &&
									<Alert danger mb={3}>{this.state.signupError}</Alert>
								}

								<form onSubmit={(e) => e.preventDefault() || this.signup()}>
									<Txt fontSize={1} mb={1}>Email</Txt>
									<Input
										mb={5}
										w='100%'
										emphasized
										type='email'
										placeholder='Email'
										value={this.state.email}
										onChange={(e) => this.setState({ email: e.target.value })}
									/>

									<Txt fontSize={1} mb={1}>Username</Txt>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Username'
										value={this.state.username}
										onChange={(e) => this.setState({ username: e.target.value })}
									/>

									<Txt fontSize={1} mb={1}>Password</Txt>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Password'
										type='password'
										value={this.state.password}
										onChange={(e) => this.setState({ password: e.target.value })}
									/>

									<Box>
										<Button
											w='100%'
											primary
											emphasized
											disabled={!this.state.email || !this.state.username || !this.state.password || this.state.loggingIn}
											onClick={(e) => e.preventDefault() || this.signup()}
										>
											{this.state.loggingIn ? <Icon name='cog fa-spin' /> : 'Sign up' }
										</Button>
									</Box>
									<Txt color='#908c99' fontSize={0} my={4} align='center'>
										By clicking "Sign up" you confirm that you have performed the <Link blank href='https://bosshamster.deviantart.com/art/Summoning-Cthulhu-For-Dummies-31645860'>initiation rituals</Link>
									</Txt>
								</form>
							</React.Fragment>
						}

						{!this.state.showSignup &&
							<React.Fragment>
								<Txt align='center' mb={4} >
									<Heading.h2 mb={2}>Log in to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Txt>

								<Divider color='#eee' mb={4} />

								{this.state.loginError &&
									<Alert danger mb={3}>{this.state.loginError}</Alert>
								}

								<form onSubmit={(e) => e.preventDefault() || this.login()}>
									<Txt fontSize={1} mb={1}>Username</Txt>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Username'
										value={this.state.username}
										onChange={(e) => this.setState({ username: e.target.value })}
									/>

									<Txt fontSize={1} mb={1}>Password</Txt>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Password'
										type='password'
										value={this.state.password}
										onChange={(e) => this.setState({ password: e.target.value })}
									/>

									<Box>
										<Button
											w='100%'
											primary
											emphasized
											disabled={!this.state.username || !this.state.password || this.state.loggingIn}
											onClick={(e) => e.preventDefault() || this.login()}
										>
											{this.state.loggingIn ? <Icon name='cog fa-spin' /> : 'Log in' }
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
