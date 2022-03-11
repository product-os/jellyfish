import React from 'react';
import _ from 'lodash';
import { Input } from 'rendition';
import * as notifications from '../../../services/notifications';
import { Icon } from '../../';
import {
	AuthCard,
	AuthHeading,
	AuthForm,
	AuthField,
	AuthButton,
} from '../AuthUtil';

export default class CompleteFirstTimeLogin extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.state = {
			password: '',
			passwordConfirmation: '',
		};

		this.handleInputChange = this.handleInputChange.bind(this);
		this.completeFirstTimeLogin = this.completeFirstTimeLogin.bind(this);
	}

	handleInputChange(event) {
		this.setState({
			[event.target.name]: event.target.value,
		});
	}

	completeFirstTimeLogin(event) {
		event.preventDefault();
		const { password } = this.state;

		this.setState(
			{
				completingFirstTimeLogin: true,
			},
			async () => {
				try {
					await this.props.actions.completeFirstTimeLogin({
						password,
						firstTimeLoginToken: this.props.match.params.firstTimeLoginToken,
					});
					notifications.addNotification('success', 'Successfully set password');
					this.props.history.push('/');
				} catch (error: any) {
					notifications.addNotification('danger', error.message || error);
					this.setState({
						completingFirstTimeLogin: false,
					});
				}
			},
		);
	}

	render() {
		const { password, passwordConfirmation, completingFirstTimeLogin } =
			this.state;

		const username = _.get(this.props, ['match', 'params', 'username'], '');

		return (
			<AuthCard>
				<AuthHeading
					title="Set Password"
					subtitle="Enter your password below"
				/>
				<AuthForm
					data-test="completeFirstTimeLogin-page__form"
					onSubmit={this.completeFirstTimeLogin}
				>
					<Input
						display="none"
						name="username"
						autoComplete="username"
						value={username}
					/>
					<AuthField
						name="password"
						label="Password"
						data-test="completeFirstTimeLogin-page__password"
						tabIndex={1}
						placeholder="New Password"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={this.handleInputChange}
					/>
					<AuthField
						name="passwordConfirmation"
						label="Password Confirmation"
						data-test="completeFirstTimeLogin-page__password-confirmation"
						tabIndex={2}
						placeholder="Password Confirmation"
						type="password"
						autoComplete="new-password"
						value={passwordConfirmation}
						onChange={this.handleInputChange}
					/>
					<AuthButton
						tabIndex={3}
						data-test="completeFirstTimeLogin-page__submit"
						disabled={
							!password ||
							passwordConfirmation !== password ||
							completingFirstTimeLogin
						}
					>
						{completingFirstTimeLogin ? (
							<Icon spin name="cog" />
						) : (
							'Set password'
						)}
					</AuthButton>
				</AuthForm>
			</AuthCard>
		);
	}
}
