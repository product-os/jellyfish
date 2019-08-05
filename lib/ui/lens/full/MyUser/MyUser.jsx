/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Box,
	Alert,
	Flex,
	Button,
	Heading,
	Select,
	Txt,
	Tab,
	Tabs,
	Divider,
	Link
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import * as skhema from 'skhema'
import * as helpers from '../../../services/helpers'
import CardLayout from '../../../layouts/CardLayout'
import Avatar from '../../../shame/Avatar'
import Icon from '../../../shame/Icon'

const SLUG = 'lens-my-user'

export default class MyUser extends React.Component {
	constructor (props) {
		super(props)

		this.handleSendCommandChange = this.handleSendCommandChange.bind(this)

		this.bindMethods([
			'handlePasswordFormChange',
			'changePassword',
			'startAuthorize'
		])

		this.state = {
			updatingSendCommand: false,
			settingPassword: false,
			changePassword: {}
		}
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	async startAuthorize () {
		this.setState({
			fetchingIntegrationUrl: true
		})
		const user = this.props.card
		const url = await this.props.actions.getIntegrationAuthUrl(user, 'outreach')
		window.location.href = url
	}

	async handleSendCommandChange (payload) {
		const command = payload.value

		this.setState({
			updatingSendCommand: true
		})

		await this.props.actions.setSendCommand(command)

		this.setState({
			updatingSendCommand: false
		})
	}

	handlePasswordFormChange (data) {
		this.setState({
			changePassword: Object.assign({}, data.formData)
		})
	}

	async changePassword () {
		this.setState({
			settingPassword: true
		})

		const {
			currentPassword,
			newPassword
		} = this.state.changePassword

		await this.props.actions.setPassword(currentPassword, newPassword)

		this.setState({
			settingPassword: false,
			changePassword: {}
		})
	}

	render () {
		const user = this.props.card
		const sendCommand = _.get(user.data, [ 'profile', 'sendCommand' ], 'shift+enter')
		const userType = _.find(this.props.types, {
			slug: 'user'
		})
		const sendOptions = userType.data.schema.properties.data.properties.profile.properties.sendCommand.enum

		// This is the old PBKDF password hash location
		const shouldChangePassword = Boolean(user.data.password)

		const schema = {
			type: 'object',
			required: [ 'currentPassword', 'newPassword' ],
			properties: {
				currentPassword: {
					type: 'string'
				},
				newPassword: {
					type: 'string'
				}
			}
		}

		const isValid = skhema.isValid(schema,
			helpers.removeUndefinedArrayItems(this.state.changePassword))

		const uiSchema = {
			'ui:order': [ 'currentPassword', 'newPassword', '*' ],
			currentPassword: {
				'ui:widget': 'password'
			},
			newPassword: {
				'ui:widget': 'password'
			}
		}

		return (
			<CardLayout
				data-test={`lens--${SLUG}`}
				card={user}
				channel={this.props.channel}
				noActions
				title={(
					<Heading.h4>
						Settings
					</Heading.h4>
				)}
			>
				<Tabs
					tabs={[ 'Profile', 'Account', 'Interface', 'Oauth' ]}
					pt={3}
					px={3}
				>
					<Tab title="Profile">
						<Box mt={3}>
							<Flex>
								<Avatar
									name={user.name || user.slug.replace('user-', '')}
									url={_.get(user, [ 'data', 'avatar' ])}
								/>

								<Box ml={2}>
									<strong>{user.slug.replace('user-', '')}</strong>

									<br />
									<strong>{user.data.email}</strong>
								</Box>
							</Flex>
						</Box>
					</Tab>

					<Tab title="Account">
						<Box mt={3}>
							<label>
								Change password:
							</label>

							{shouldChangePassword && (
								<Alert my={2} warning>
									You have a password reset due!
								</Alert>
							)}

							<Form
								schema={schema}
								uiSchema={uiSchema}
								onFormChange={this.handlePasswordFormChange}
								value={this.state.changePassword}
								hideSubmitButton={true}
							/>
							<Button
								primary
								onClick={this.changePassword}
								disabled={!isValid || this.state.settingPassword}
							>
								Submit
							</Button>
						</Box>
					</Tab>

					<Tab title="Interface">
						<Box mt={3}>
							<label>
								Command to send messages:
							</label>

							<br/>

							<Select
								data-test={`${SLUG}__send-command-select`}
								mr={3}
								value={sendCommand}
								onChange={this.handleSendCommandChange}
								disabled={this.state.updatingSendCommand}
								options={sendOptions}
							/>

							{this.state.updatingSendCommand && (
								<Icon spin name="cog" />
							)}
						</Box>
					</Tab>

					<Tab title="Oauth">
						<Box mt={3}>
							<Divider color="#eee" />

							<Flex justifyContent="space-between" alignItems="center">
								<Link href="https://www.outreach.io/" blank>
									<Txt bold>Outreach</Txt>
								</Link>

								{_.get(user, [ 'data', 'oauth', 'outreach' ]) ? (
									<Txt>Authorized</Txt>
								) : (
									<Button
										data-test="integration-connection--outreach"
										onClick={this.startAuthorize}
									>
										{this.state.fetchingIntegrationUrl ? (
											<Icon spin name="cog" />
										) : 'Connect'
										}
									</Button>
								)}
							</Flex>

							<Divider color="#eee" />
						</Box>
					</Tab>
				</Tabs>
			</CardLayout>
		)
	}
}
