import * as jsonpatch from 'fast-json-patch';
import _ from 'lodash';
import React from 'react';
import { Box, Button, Heading, Txt, Tab, Tabs, Form } from 'rendition';
import * as skhema from 'skhema';
import { Setup, withSetup } from '../../../components';
import * as timezones from '../../../services/timezones';
import * as helpers from '../../../services/helpers';
import { customQueryTabs } from '../../common';
import CardLayout from '../../../layouts/CardLayout';
import { Contract, TypeContract } from 'autumndb';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { actionCreators } from '../../../store';
import { JSONSchema7 } from 'json-schema';

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

export interface StateProps {
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

// TODO: Refactor generic props handling for action lenses.
// It's a mess that we overload the card property like this.
export type OwnProps = Omit<LensRendererProps, 'card'> & {
	card: {
		card: Contract;
		types: TypeContract[];
		onDone: { action: string };
	};
};

type Props = StateProps & DispatchProps & OwnProps & Setup;

interface State {
	submitting: boolean;
	changePassword: {
		currentPassword?: string;
		newPassword?: string;
	};
	userProfileSchema: JSONSchema7;
	interfaceSchema: JSONSchema7;
	fetchingIntegrationUrl: boolean;
}

export default withSetup(
	class EditMyUserLens extends React.Component<Props, State> {
		constructor(props) {
			super(props);

			this.bindMethods([
				'handleFormSubmit',
				'handlePasswordFormChange',
				'changePassword',
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
			const interfaceSchema: JSONSchema7 = {
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
				fetchingIntegrationUrl: false,
			};
		}

		bindMethods(methods) {
			methods.forEach((method) => {
				this[method] = this[method].bind(this);
			});
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
					const patches = jsonpatch.compare(
						this.props.card.card,
						event.formData,
					);
					await this.props.actions.updateUser(patches);

					this.setState({
						submitting: false,
					});
				},
			);
		}

		close = () => {
			this.props.actions.removeChannel(this.props.channel);
		};

		async changePassword() {
			this.setState(
				{
					submitting: true,
				},
				async () => {
					const { currentPassword, newPassword } = this.state.changePassword;

					if (currentPassword && newPassword) {
						await this.props.actions.setPassword(currentPassword, newPassword);
					}

					this.setState({
						submitting: false,
						changePassword: {},
					});
				},
			);
		}

		render() {
			const {
				types,
				channel,
				card: { card: user },
			} = this.props;

			const { changePassword, submitting, userProfileSchema, interfaceSchema } =
				this.state;

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

			const userTypeCard = helpers.getType('user', types);

			return (
				<CardLayout
					data-test="lens--edit-my-user"
					card={user}
					onClose={this.close}
					overflowY
					channel={channel}
					noActions
					title={<Heading.h4>Settings</Heading.h4>}
				>
					<Tabs
						// @ts-expect-error: Rendition's Tabs component is (incorrectly?) cast to React.FunctionComponent<TabsProps>
						// so it doesn't know about pt and px
						pt={3}
					>
						<Tab title="Profile" data-test="tab_profile">
							<Box p={3} flex={1}>
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
							<Box p={3} flex={1}>
								<label>Change password:</label>

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
							<Box p={3} flex={1}>
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

						<Tab title="Access tokens" data-test="tab_access_tokens">
							<Box p={3} flex={1}>
								<label>
									Session token{' '}
									<Txt.span fontSize={2} color="text.light">
										(expires after 7 days)
									</Txt.span>
									:
								</label>
								<br />
								<Txt
									copy={this.props.sdk.getAuthToken()!}
									showCopyMode="always"
								>
									<code>{this.props.sdk.getAuthToken()}</code>
								</Txt>
							</Box>
						</Tab>

						{customQueryTabs(user, userTypeCard, channel)}
					</Tabs>
				</CardLayout>
			);
		}
	},
);
