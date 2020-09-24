/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as jsonpatch from 'fast-json-patch'
import * as _ from 'lodash'
import {
	tz
} from 'moment-timezone'
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
	Link,
	Form
} from 'rendition'
import * as skhema from 'skhema'
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'
import CardLayout from '../../../layouts/CardLayout'
import Avatar from '@balena/jellyfish-ui-components/lib/shame/Avatar'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import UiThemeSelector from '../../../components/UiThemeSelector'

const SLUG = 'lens-my-user'

export default class MyUser extends React.Component {
	constructor (props) {
		super(props)

		this.handleSendCommandChange = this.handleSendCommandChange.bind(this)

		this.bindMethods([
			'handlePasswordFormChange',
			'handleProfileFormSubmit',
			'changePassword',
			'startAuthorize'
		])

		const userTypeCard = props.types.find((card) => {
			return card.slug === 'user'
		})

		const userProfileSchema = _.pick(userTypeCard.data.schema, [
			'properties.data.type',
			'properties.data.properties.avatar',
			'properties.data.properties.profile.properties.name',
			'properties.data.properties.profile.properties.startDate',
			'properties.data.properties.profile.properties.birthday',
			'properties.data.properties.profile.properties.about',
			'properties.data.properties.profile.properties.timezone',
			'properties.data.properties.profile.properties.city',
			'properties.data.properties.profile.properties.country'
		])

		userProfileSchema.properties.data.properties.profile.properties.timezone.enum = tz.names()

		this.state = {
			updatingSendCommand: false,
			settingPassword: false,
			changePassword: {},
			userProfileData: props.card,
			userProfileSchema
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

	handleProfileFormSubmit (event) {
		this.setState({
			userProfileData: event.formData
		})

		const patches = jsonpatch.compare(this.props.card, event.formData)

		this.props.actions.updateUser(patches)
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

		const emails = Array.isArray(user.data.email) ? user.data.email.join(', ') : user.data.email

		const userProfileUiSchema = {
			data: {
				profile: {
					about: {
						aboutMe: {
							'ui:widget': 'textarea',
							'ui:options': {
								rows: 5
							}
						}
					},
					timezone: {
						'ui:widget': 'select'
					},
					birthday: {
						'ui:placeholder': 'mm/dd'
					}
				}
			}
		}

		return (
			<CardLayout
				data-test={`lens--${SLUG}`}
				card={user}
				overflowY
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
							<Flex mb={3}>
								<Avatar
									name={user.name || user.slug.replace('user-', '')}
									url={_.get(user, [ 'data', 'avatar' ])}
									userStatus={_.get(user, [ 'data', 'status' ])}
								/>

								<Box ml={2}>
									<strong>{user.slug.replace('user-', '')}</strong>

									<br />
									<strong>{emails}</strong>
								</Box>
							</Flex>

							<Form
								schema={this.state.userProfileSchema}
								uiSchema={userProfileUiSchema}
								onFormSubmit={this.handleProfileFormSubmit}
								value={this.state.userProfileData}/>
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
						<Box mt={3}>
							<label>
								UI Theme:
							</label>

							<br />

							<UiThemeSelector user={user} types={this.props.types} />
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
