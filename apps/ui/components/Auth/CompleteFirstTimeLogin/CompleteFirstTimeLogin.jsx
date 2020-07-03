/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Button,
	Divider,
	Heading,
	Input,
	Txt
} from 'rendition'
import Icon from '../../../../../lib/ui-components/shame/Icon'

class CompleteFirstTimeLogin extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			password: '',
			passwordConfirmation: ''
		}

		this.handleInputChange = this.handleInputChange.bind(this)
		this.completeFirstTimeLogin = this.completeFirstTimeLogin.bind(this)
	}

	handleInputChange (event) {
		this.setState({
			[event.target.name]: event.target.value
		})
	}

	completeFirstTimeLogin (event) {
		event.preventDefault()
		const {
			password
		} = this.state

		this.setState({
			completingFirstTimeLogin: true
		}, async () => {
			try {
				await this.props.actions.completeFirstTimeLogin({
					password,
					firstTimeLoginToken: this.props.match.params.firstTimeLoginToken
				})
				this.props.actions.addNotification('success', 'Successfully set password')
				this.props.history.push('/')
			} catch (error) {
				this.props.actions.addNotification('danger', error.message || error)
				this.setState({
					completingFirstTimeLogin: false
				})
			}
		})
	}

	render () {
		const {
			password,
			passwordConfirmation,
			completingFirstTimeLogin
		} = this.state

		const username = _.get(this.props, [ 'match', 'params', 'username' ], '')

		return (
			<React.Fragment>
				<Txt align="center" mb={4}>
					<Heading.h2 mb={2}>Set Password</Heading.h2>
					<span>{'Enter your password below'}</span>
				</Txt>

				<Divider color="#eee" mb={4}/>

				<form
					data-test="completeFirstTimeLogin-page__form"
					onSubmit={this.completeFirstTimeLogin}>

					<Input display="none" name="username" autoComplete="username" value={username} />

					<Txt fontSize={1} mb={1}>Password</Txt>
					<Input
						data-test="completeFirstTimeLogin-page__password"
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
						data-test="completeFirstTimeLogin-page__password-confirmation"
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
							data-test="completeFirstTimeLogin-page__submit"
							width="100%"
							primary={true}
							emphasized={true}
							type="submit"
							disabled={!password || passwordConfirmation !== password || completingFirstTimeLogin}
						>
							{completingFirstTimeLogin ? <Icon spin name="cog"/> : 'Set password'}
						</Button>
					</Box>
				</form>
			</React.Fragment>
		)
	}
}

export default CompleteFirstTimeLogin
