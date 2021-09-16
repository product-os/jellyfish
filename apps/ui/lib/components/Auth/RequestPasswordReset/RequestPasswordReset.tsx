/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { notifications, Icon } from '@balena/jellyfish-ui-components';
import {
	AuthCard,
	AuthHeading,
	AuthForm,
	AuthField,
	AuthButton,
	AuthLink,
} from '../AuthUtil';

export default class RequestPasswordReset extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.state = {
			username: '',
			requestingPasswordReset: false,
		};

		this.handleUsernameChange = this.handleUsernameChange.bind(this);
		this.requestPasswordReset = this.requestPasswordReset.bind(this);
	}

	handleUsernameChange(event) {
		this.setState({
			username: event.target.value,
		});
	}

	requestPasswordReset(event) {
		event.preventDefault();
		const { username } = this.state;

		this.setState({
			requestingPasswordReset: true,
		});

		this.props.actions
			.requestPasswordReset({
				username,
			})
			.then(() => {
				notifications.addNotification(
					'info',
					'If this user exists, we have sent you a password reset email',
				);
			})
			.catch(() => {
				notifications.addNotification(
					'danger',
					`Whoops! Something went wrong while trying to request a password reset for username ${username}`,
				);
			})
			.finally(() => {
				this.setState({
					requestingPasswordReset: false,
				});
			});
	}

	render() {
		const { username, requestingPasswordReset } = this.state;

		return (
			<AuthCard>
				<AuthHeading
					title="Request a password reset"
					subtitle="Enter your username below"
				/>
				<AuthForm
					onSubmit={this.requestPasswordReset}
					data-test="requestPasswordReset-page__form"
				>
					<AuthField
						name="username"
						label="Username"
						tabIndex={1}
						data-test="requestPasswordReset-page__username"
						placeholder="Username"
						autoComplete="username"
						value={username}
						onChange={this.handleUsernameChange}
					/>
					<AuthButton
						tabIndex={2}
						data-test="requestPasswordReset-page__submit"
						disabled={!username || requestingPasswordReset}
					>
						{requestingPasswordReset ? <Icon spin name="cog" /> : 'Submit'}
					</AuthButton>
				</AuthForm>
				<AuthLink to="/" tabIndex={3}>
					Return to login
				</AuthLink>
			</AuthCard>
		);
	}
}
