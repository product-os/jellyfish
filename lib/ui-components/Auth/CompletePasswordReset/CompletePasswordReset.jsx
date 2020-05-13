/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import * as _ from 'lodash'
import {
	Box,
	Button,
	Divider,
	Heading,
	Input,
	Txt
} from 'rendition'
import Icon from '../../shame/Icon'

class CompletePasswordReset extends React.Component {
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
			<React.Fragment>
				<Txt align="center" mb={4}>
					<Heading.h2 mb={2}>Reset Password</Heading.h2>
					<span>{'Enter your new password below'}</span>
				</Txt>

				<Divider color="#eee" mb={4}/>

				<form
					data-test="completePasswordReset-page__form"
					onSubmit={this.completePasswordReset}>

					<Input display="none" name="username" autoComplete="username" value={username} />

					<Txt fontSize={1} mb={1}>Password</Txt>
					<Input
						data-test="completePasswordReset-page__password"
						mb={5}
						width="100%"
						emphasized={true}
						name="password"
						placeholder="New Password"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={this.handleInputChange}
					/>
					<Txt fontSize={1} mb={1}>Password Confirmation</Txt>
					<Input
						data-test="completePasswordReset-page__password-confirmation"
						mb={5}
						width="100%"
						emphasized={true}
						name="passwordConfirmation"
						placeholder="Password Confirmation"
						type="password"
						autoComplete="new-password"
						value={passwordConfirmation}
						onChange={this.handleInputChange}
					/>
					<Box>
						<Button
							data-test="completePasswordReset-page__submit"
							width="100%"
							primary={true}
							emphasized={true}
							type="submit"
							disabled={!password || passwordConfirmation !== password || completingPasswordReset}
						>
							{completingPasswordReset ? <Icon spin name="cog"/> : 'Reset password'}
						</Button>
					</Box>
				</form>
			</React.Fragment>
		)
	}
}

export default CompletePasswordReset
