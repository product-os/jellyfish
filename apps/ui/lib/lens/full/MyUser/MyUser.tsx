import * as jsonpatch from 'fast-json-patch';
import _ from 'lodash';
import React from 'react';
import { Box, Card, Divider, Flex, Txt, Tab } from 'rendition';
import * as timezones from '../../../services/timezones';
import * as helpers from '../../../services/helpers';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import LiveCollection from '../../common/LiveCollection';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { TypeContract, Contract } from '@balena/jellyfish-types/build/core';
import { actionCreators } from '../../../store';
import { JsonSchema } from '@balena/jellyfish-types';
import { Setup, withSetup } from '../../../components/SetupProvider';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

type Props = StateProps & DispatchProps & OwnProps & Setup;

interface State {
	submitting: boolean;
	changePassword: {
		currentPassword?: string;
		newPassword?: string;
	};
	userProfileSchema: JsonSchema;
	interfaceSchema: JsonSchema;
	bookmarksQuery: JsonSchema;
	loopsQuery: JsonSchema;
	orgsQuery: JsonSchema;
	mineQuery: JsonSchema;
	fetchingIntegrationUrl: boolean;
	improvements: Contract[];
	milestones: Contract[];
	issues: Contract[];
	channelsQuery: JsonSchema;
}

export default withSetup(
	class MyUser extends React.Component<Props, State> {
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
			const interfaceSchema: JsonSchema = {
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

			const bookmarksQuery: JsonSchema = {
				type: 'object',
				$$links: {
					'is bookmarked by': {
						type: 'object',
						required: ['id', 'type'],
						properties: {
							type: {
								const: 'user@1.0.0',
							},
							id: {
								const: props.card.id,
							},
						},
					},
				},
			};

			const mineQuery: JsonSchema = {
				type: 'object',
				$$links: {
					'is owned by': {
						type: 'object',
						required: ['id', 'type'],
						properties: {
							type: {
								const: 'user@1.0.0',
							},
							id: {
								const: props.card.id,
							},
						},
					},
				},
			};

			const loopsQuery: JsonSchema = {
				type: 'object',
				properties: {
					type: {
						const: 'loop@1.0.0',
					},
				},
			};

			const orgsQuery: JsonSchema = {
				type: 'object',
				$$links: {
					'has member': {
						type: 'object',
						properties: {
							id: {
								const: props.card.id,
							},
						},
					},
				},
				properties: {
					type: {
						const: 'org@1.0.0',
					},
				},
			};

			const channelsQuery: JsonSchema = {
				type: 'object',
				$$links: {
					'has agent': {
						type: 'object',
						properties: {
							id: {
								const: props.card.id,
							},
						},
					},
				},
				properties: {
					type: {
						const: 'channel@1.0.0',
					},
				},
			};

			this.state = {
				submitting: false,
				changePassword: {},
				userProfileSchema,
				interfaceSchema,
				bookmarksQuery,
				loopsQuery,
				orgsQuery,
				mineQuery,
				fetchingIntegrationUrl: false,
				improvements: [],
				milestones: [],
				issues: [],
				channelsQuery,
			};
		}

		async componentDidMount() {
			const results = await this.props.sdk.query({
				type: 'object',
				properties: {
					type: {
						type: 'string',
						enum: ['improvement@1.0.0', 'milestone@1.0.0', 'issue@1.0.0'],
					},
					data: {
						type: 'object',
						required: ['status'],
						properties: {
							status: {
								type: 'string',
								not: {
									enum: ['proposed', 'denied-or-failed', 'completed', 'closed'],
								},
							},
						},
					},
				},
				$$links: {
					'is owned by': {
						type: 'object',
						required: ['id', 'type'],
						properties: {
							type: {
								const: 'user@1.0.0',
							},
							id: {
								const: this.props.card.id,
							},
						},
					},
				},
			});

			const groups = _.groupBy(results, 'type');

			this.setState({
				improvements: groups['improvement@1.0.0'] || [],
				milestones: groups['milestone@1.0.0'] || [],
				issues: groups['issue@1.0.0'] || [],
			});
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
			const { channel, card: user } = this.props;
			const { improvements, milestones, issues } = this.state;

			let snippetLens;

			const resultSet = improvements.concat(milestones).concat(issues);
			if (resultSet.length) {
				const { getLenses } = require('../../');
				const lenses = getLenses('snippet', resultSet[0], this.props.user);
				snippetLens = lenses[0];
			}

			const firstName = _.get(user, ['data', 'profile', 'name', 'first']);
			const lastName = _.get(user, ['data', 'profile', 'name', 'last']);
			const name =
				firstName && lastName ? `${firstName} ${lastName}` : user.slug.slice(5);

			return (
				<TabbedContractLayout
					data-test="lens--lens-my-user"
					card={user}
					channel={channel}
					title={<Txt bold>{name}</Txt>}
					maxWidth="100%"
					tabs={[
						<Tab title="Loops" key="loops">
							<Flex
								flexDirection="column"
								flex="1"
								style={{
									maxWidth: '100%',
								}}
							>
								<LiveCollection
									key="loops"
									hideFooter
									channel={this.props.channel}
									query={this.state.loopsQuery}
									card={this.props.card}
								/>
							</Flex>
						</Tab>,
						<Tab title="Bookmarks" key="bookmarks">
							<Flex
								flexDirection="column"
								flex="1"
								style={{
									maxWidth: '100%',
								}}
							>
								<LiveCollection
									key="bookmarks"
									hideFooter
									channel={this.props.channel}
									query={this.state.bookmarksQuery}
									card={this.props.card}
								/>
							</Flex>
						</Tab>,
						<Tab title="Orgs" key="orgs">
							<Flex
								flexDirection="column"
								flex="1"
								style={{
									maxWidth: '100%',
								}}
							>
								<LiveCollection
									key="orgs"
									hideFooter
									channel={this.props.channel}
									query={this.state.orgsQuery}
									card={this.props.card}
								/>
							</Flex>
						</Tab>,
						<Tab title="Assigned Channels" key="channels">
							<Flex
								flexDirection="column"
								flex="1"
								style={{
									maxWidth: '100%',
								}}
							>
								<LiveCollection
									key="channels"
									hideFooter
									channel={this.props.channel}
									query={this.state.channelsQuery}
									card={this.props.card}
								/>
							</Flex>
						</Tab>,
						<Tab title="My contracts" key="mine">
							<Flex
								flexDirection="column"
								flex="1"
								style={{
									maxWidth: '100%',
								}}
							>
								<LiveCollection
									key="mine"
									hideFooter
									channel={this.props.channel}
									query={this.state.mineQuery}
									card={this.props.card}
								/>
							</Flex>
						</Tab>,
					]}
				>
					<Flex my={3} flexWrap="wrap">
						<Card p={3} m={3} flex="1 1 300px">
							<Txt bold>Active Issues</Txt>

							{Boolean(snippetLens) && (
								<Box mx={-3}>
									{issues.map((c) => {
										return (
											<snippetLens.data.renderer
												card={c}
												types={this.props.types}
											/>
										);
									})}
								</Box>
							)}
						</Card>

						<Card p={3} m={3} flex="1 1 300px">
							<Txt bold>Active Milestones</Txt>

							{Boolean(snippetLens) && (
								<Box mx={-3}>
									{milestones.map((c) => {
										return (
											<snippetLens.data.renderer
												card={c}
												types={this.props.types}
											/>
										);
									})}
								</Box>
							)}
						</Card>

						<Card p={3} m={3} flex="1 1 300px">
							<Txt bold>Active Improvements</Txt>

							{Boolean(snippetLens) && (
								<Box mx={-3}>
									{improvements.map((c) => {
										return (
											<snippetLens.data.renderer
												card={c}
												types={this.props.types}
											/>
										);
									})}
								</Box>
							)}
						</Card>
					</Flex>
				</TabbedContractLayout>
			);
		}
	},
);
