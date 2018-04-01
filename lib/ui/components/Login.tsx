import * as React from 'react';
import {
	Box,
	Button,
	Container,
	Divider,
	Heading,
	Image,
	Input,
	Link,
	Text,
} from 'rendition';
import * as sdk from '../services/sdk';
import TopBar from './TopBar';

interface LoginState {
	showSignup: boolean;
	username: string;
	password: string;
	email: string;
}

export default class Login extends React.Component<{}, LoginState> {
	constructor(props: {}) {
		super(props);

		this.state = {
			showSignup: false,
			username: '',
			password: '',
			email: '',
		};
	}

	public signup() {
		const { username, password, email } = this.state;
		sdk.signup({
			username,
			password,
			email,
		});
	}

	public login() {
		const { username, password } = this.state;
		sdk.login({
			username,
			password,
		});
	}

	public render() {
		return (
			<React.Fragment>
				<TopBar>
					<Image w={70} pl={2} p={10} src='/icons/jellyfish.svg' />

					<Button mr={3} onClick={() => this.setState({ showSignup: !this.state.showSignup })}>
						{this.state.showSignup ? 'Log in' : 'Sign up'}
					</Button>
				</TopBar>
				<Container mt={4}>
					<Box mx='auto' style={{maxWidth: 470}}>
						{this.state.showSignup &&
							<React.Fragment>
								<Text align='center' mb={4} >
									<Heading.h2 mb={2}>Sign up to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Text>

								<Divider color='#eee' mb={4} />
								<form onSubmit={(e) => e.preventDefault() || this.signup()}>
									<Text fontSize={1} mb={1}>Email</Text>
									<Input
										mb={5}
										w='100%'
										emphasized
										type='email'
										placeholder='Email'
										value={this.state.email}
										onChange={(e) => this.setState({ email: e.target.value })}
									/>

									<Text fontSize={1} mb={1}>Username</Text>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Username'
										value={this.state.username}
										onChange={(e) => this.setState({ username: e.target.value })}
									/>

									<Text fontSize={1} mb={1}>Password</Text>
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
											disabled={!this.state.email || !this.state.username || !this.state.password}
											onClick={(e) => e.preventDefault() || this.signup()}
										>Sign up</Button>
									</Box>
									<Text color='#908c99' fontSize={0} my={4} align='center'>
										By clicking "Sign up" you confirm that you have performed the <Link blank href='https://bosshamster.deviantart.com/art/Summoning-Cthulhu-For-Dummies-31645860'>initiation rituals</Link>
									</Text>
								</form>
							</React.Fragment>
						}

						{!this.state.showSignup &&
							<React.Fragment>
								<Text align='center' mb={4} >
									<Heading.h2 mb={2}>Log in to Jellyfish</Heading.h2>
									<span>Enter your details below</span>
								</Text>

								<Divider color='#eee' mb={4} />
								<form onSubmit={(e) => e.preventDefault() || this.login()}>
									<Text fontSize={1} mb={1}>Username</Text>
									<Input
										mb={5}
										w='100%'
										emphasized
										placeholder='Username'
										value={this.state.username}
										onChange={(e) => this.setState({ username: e.target.value })}
									/>

									<Text fontSize={1} mb={1}>Password</Text>
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
											disabled={!this.state.username || !this.state.password}
											onClick={(e) => e.preventDefault() || this.login()}
										>Log in</Button>
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
