import React, { useState } from 'react';
import * as notifications from '../../../services/notifications';
import { Icon } from '../../';
import {
	AuthCard,
	AuthHeading,
	AuthForm,
	AuthField,
	AuthButton,
	AuthLink,
} from '../AuthUtil';
import { useDispatch } from 'react-redux';
import { actionCreators } from '../../../store';

const Login = () => {
	const dispatch = useDispatch();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loggingIn, setLoggingIn] = useState(false);

	const handleUsernameChange = React.useCallback((event) => {
		setUsername(event.target.value);
	}, []);

	const handlePasswordChange = React.useCallback((event) => {
		setPassword(event.target.value);
	}, []);

	const handleLogin = React.useCallback(
		async (event) => {
			event.preventDefault();
			setLoggingIn(true);

			try {
				dispatch(
					actionCreators.login({
						username,
						password,
					}),
				);
			} catch (error: any) {
				notifications.addNotification('danger', error.message || error);
			} finally {
				setLoggingIn(false);
			}
		},
		[username, password],
	);

	return (
		<AuthCard className="login-page">
			<AuthHeading
				title="Login to Jellyfish"
				subtitle="Enter your details below"
			/>
			<AuthForm onSubmit={handleLogin}>
				<AuthField
					tabIndex={1}
					name="username"
					label="Username"
					className="login-page__input--username"
					placeholder="Username"
					autoComplete="username"
					value={username}
					onChange={handleUsernameChange}
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
					onChange={handlePasswordChange}
				/>
				<AuthButton
					tabIndex={3}
					className="login-page__submit--login"
					disabled={!username || !password || loggingIn}
				>
					{loggingIn ? <Icon spin name="cog" /> : 'Log in'}
				</AuthButton>
			</AuthForm>
			<AuthLink to="/request_password_reset" tabIndex={4}>
				Forgot Password?
			</AuthLink>
		</AuthCard>
	);
};

export default Login;
