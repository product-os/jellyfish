/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Input
} from 'rendition'
import Icon from '../../../../../lib/ui-components/shame/Icon'
import {
	AuthCard, AuthHeading, AuthForm, AuthField, AuthButton
} from '../AuthUtil'

export default class CompletePasswordReset extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			password: '',
			passwordConfirmation: ''
		}

		this.handleInputChange = this.handleInputChange.bind(this)
		this.completePasswordReset = this.completePasswordReset.bind(this)
	}

	handleInputChange (event) {
		this.setState({
			[event.target.name]: event.target.value
		})
	}

	completePasswordReset (event) {
		event.preventDefault()
		const {
			password
		} = this.state

		this.setState({
			completingPasswordReset: true
		}, async () => {
			try {
				await this.props.actions.completePasswordReset({
					password,
					resetToken: this.props.match.params.resetToken
				})
				this.props.actions.addNotification('success', 'Successfully reset password')
				this.props.history.push('/')
			} catch (error) {
				this.props.actions.addNotification('danger', error.message || error)
				this.setState({
					completePasswordReset: false
				})
			}
		})
	}

	render () {
		const {
			password,
			passwordConfirmation,
			completingPasswordReset
		} = this.state

		const username = _.get(this.props, [ 'match', 'params', 'username' ], '')

		return (
			<AuthCard>
				<AuthHeading title="Reset Password" subtitle="Enter your new password below" />
				<AuthForm
					data-test="completePasswordReset-page__form"
					onSubmit={this.completePasswordReset}
				>
					<Input display="none" name="username" autoComplete="username" value={username} />
					<AuthField
						name="password"
						label="Password"
						data-test="completePasswordReset-page__password"
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
						data-test="completePasswordReset-page__password-confirmation"
						tabIndex={2}
						placeholder="Password Confirmation"
						type="password"
						autoComplete="new-password"
						value={passwordConfirmation}
						onChange={this.handleInputChange}
					/>
					<AuthButton
						tabIndex={3}
						data-test="completePasswordReset-page__submit"
						disabled={!password || passwordConfirmation !== password || completingPasswordReset}
					>
						{completingPasswordReset ? <Icon spin name="cog"/> : 'Reset password'}
					</AuthButton>
				</AuthForm>
			</AuthCard>
		)
	}
}
