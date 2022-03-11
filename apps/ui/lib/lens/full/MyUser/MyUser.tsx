import * as jsonpatch from 'fast-json-patch';
import _ from 'lodash';
import React from 'react';
import {
	Box,
	Alert,
	Flex,
	Button,
	Heading,
	Txt,
	Tab,
	Tabs,
	Divider,
	Link,
	Form,
	TextWithCopy,
} from 'rendition';
import * as skhema from 'skhema';
import { Icon, UserAvatar } from '../../../components';
import * as timezones from '../../../services/timezones';
import * as helpers from '../../../services/helpers';
import { RelationshipsTab, customQueryTabs } from '../../common';
import CardLayout from '../../../layouts/CardLayout';

const SLUG = 'lens-my-user';

const userProfileUiSchema = {
	data: {
		profile: {
			about: {
				aboutMe: {
					'ui:widget': 'textarea',
					'ui:options': {
						rows: 5,
					},
				},
			},
			timezone: {
				'ui:widget': 'select',
			},
			birthday: {
				'ui:placeholder': 'mm/dd',
			},
		},
	},
};

const interfaceUiSchema = {
	data: {
		profile: {
			sendCommand: {
				'ui:widget': 'select',
			},
		},
	},
};

export default class MyUser extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.bindMethods([
			'handleFormSubmit',
			'handlePasswordFormChange',
			'changePassword',
			'startAuthorize',
		]);

		const userTypeCard = helpers.getType('user', props.types);

		const userProfileSchema: any = _.pick(userTypeCard.data.schema, [
			'properties.data.type',
			'properties.data.properties.avatar',
			'properties.data.properties.email',
			'properties.data.properties.profile.properties.name',
			'properties.data.properties.profile.properties.startDate',
			'properties.data.properties.profile.properties.birthday',
			'properties.data.properties.profile.properties.about',
			'properties.data.properties.profile.properties.timezone',
			'properties.data.properties.profile.properties.city',
			'properties.data.properties.profile.properties.country',
		]);

		userProfileSchema.properties.data.properties.profile.properties.timezone.enum =
			timezones.names;

		// Annoyingly we have to explicitly set the title fields to '' to avoid them being displayed
		const interfaceSchema = {
			properties: {
				data: {
					type: 'object',
					title: '',
					properties: {
						profile: {
							type: 'object',
							title: '',
							properties: {
								sendCommand:
									userTypeCard.data.schema.properties.data.properties.profile
										.properties.sendCommand,
								disableNotificationSound:
									userTypeCard.data.schema.properties.data.properties.profile
										.properties.disableNotificationSound,
							},
						},
					},
				},
			},
		};

		this.state = {
			submitting: false,
			changePassword: {},
			userProfileSchema,
			interfaceSchema,
		};
	}

	bindMethods(methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this);
		});
	}

	async startAuthorize() {
		this.setState({
			fetchingIntegrationUrl: true,
		});
		const user = this.props.card;
		const url = await this.props.actions.getIntegrationAuthUrl(
			user,
			'outreach',
		);
		window.location.href = url;
	}

	handlePasswordFormChange(data) {
		this.setState({
			changePassword: Object.assign({}, data.formData),
		});
	}

	handleFormSubmit(event) {
		this.setState(
			{
				submitting: true,
			},
			async () => {
				const patches = jsonpatch.compare(this.props.card, event.formData);
				await this.props.actions.updateUser(patches);

				this.setState({
					submitting: false,
				});
			},
		);
	}

	async changePassword() {
		this.setState(
			{
				submitting: true,
			},
			async () => {
				const { currentPassword, newPassword } = this.state.changePassword;

				await this.props.actions.setPassword(currentPassword, newPassword);

				this.setState({
					submitting: false,
					changePassword: {},
				});
			},
		);
	}

	render() {
		const { types, channel, card: user } = this.props;

		const { changePassword, submitting, userProfileSchema, interfaceSchema } =
			this.state;

		// This is the old PBKDF password hash location
		const shouldChangePassword = Boolean(user.data.password);

		const accountSchema: any = {
			type: 'object',
			required: ['currentPassword', 'newPassword'],
			properties: {
				currentPassword: {
					type: 'string',
				},
				newPassword: {
					type: 'string',
				},
			},
		};

		const isValid = skhema.isValid(
			accountSchema,
			helpers.removeUndefinedArrayItems(changePassword),
		);

		const accountUiSchema = {
			'ui:order': ['currentPassword', 'newPassword', '*'],
			currentPassword: {
				'ui:widget': 'password',
			},
			newPassword: {
				'ui:widget': 'password',
			},
		};

		const emails = Array.isArray(user.data.email)
			? user.data.email.join(', ')
			: user.data.email;

		const userTypeCard = helpers.getType('user', types);

		return (
			<CardLayout
				data-test={`lens--${SLUG}`}
				card={user}
				overflowY
				channel={channel}
				noActions
				title={<Heading.h4>Settings</Heading.h4>}
			>
				<Tabs
					// @ts-ignore: Rendition's Tabs component is (incorrectly?) cast to React.FunctionComponent<TabsProps>
					// so it doesn't know about pt and px
					pt={3}
					px={3}
				>
					<Tab title="Profile" data-test="tab_profile">
						<Box mt={3}>
							<Flex mb={3}>
								<UserAvatar user={user} emphasized />
								<Box ml={2}>
									<strong>{user.slug.replace('user-', '')}</strong>

									<br />
									<strong>{emails}</strong>
								</Box>
							</Flex>

							<Form
								data-test="form_profile"
								submitButtonProps={{
									disabled: submitting,
								}}
								schema={userProfileSchema}
								uiSchema={userProfileUiSchema}
								onFormSubmit={this.handleFormSubmit}
								value={user}
							/>
						</Box>
					</Tab>

					<Tab title="Account" data-test="tab_account">
						<Box mt={3}>
							<label>Change password:</label>

							{shouldChangePassword && (
								<Alert my={2} warning>
									You have a password reset due!
								</Alert>
							)}

							<Form
								data-test="form_account"
								schema={accountSchema}
								uiSchema={accountUiSchema}
								onFormChange={this.handlePasswordFormChange}
								value={changePassword}
								hideSubmitButton={true}
							/>
							<Button
								primary
								type="submit"
								onClick={this.changePassword}
								disabled={!isValid || submitting}
							>
								Submit
							</Button>
						</Box>
					</Tab>

					<Tab title="Interface" data-test="tab_interface">
						<Box mt={3}>
							<Form
								data-test="form_interface"
								submitButtonProps={{
									disabled: submitting,
								}}
								schema={interfaceSchema}
								uiSchema={interfaceUiSchema}
								onFormSubmit={this.handleFormSubmit}
								value={user}
							/>
						</Box>
					</Tab>

					<Tab title="Oauth" data-test="tab_oauth">
						<Box mt={3}>
							<Divider color="#eee" />

							<Flex justifyContent="space-between" alignItems="center">
								<Link href="https://www.outreach.io/" blank>
									<Txt bold mr={2}>
										Outreach
									</Txt>
								</Link>

								{_.get(user, ['data', 'oauth', 'outreach']) ? (
									<Txt>Authorized</Txt>
								) : (
									<Button
										data-test="integration-connection--outreach"
										onClick={this.startAuthorize}
									>
										{this.state.fetchingIntegrationUrl ? (
											<Icon spin name="cog" />
										) : (
											'Connect'
										)}
									</Button>
								)}
							</Flex>

							<Divider color="#eee" />
						</Box>
					</Tab>

					<Tab title="Access tokens" data-test="tab_access_tokens">
						<Box mt={3}>
							<label>
								Session token{' '}
								<Txt.span fontSize={2} color="text.light">
									(expires after 7 days)
								</Txt.span>
								:
							</label>
							<br />
							<TextWithCopy
								copy={this.props.sdk.authToken}
								showCopyButton="always"
							>
								<code>{this.props.sdk.authToken}</code>
							</TextWithCopy>
						</Box>
					</Tab>

					{customQueryTabs(user, userTypeCard, channel)}
					<RelationshipsTab card={user} channel={channel} />
				</Tabs>
			</CardLayout>
		);
	}
}
