import _ from 'lodash';
import React from 'react';
import skhema from 'skhema';
import { Redirect } from 'react-router-dom';
import { Box, Flex, Heading, Input, Txt } from 'rendition';
import styled from 'styled-components';
import { Icon, Setup, UserAvatar, withSetup } from '../../../components';

import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import CardLayout from '../../../layouts/CardLayout';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { actionCreators } from '../../../store';
import { JsonSchema, TypeContract, UserContract } from 'autumndb';

const UserRow = styled(Box)`
	border-bottom: 1px solid #eee;
	cursor: pointer;

	&:hover {
		background: #eee;
	}
`;

export interface StateProps {
	allTypes: TypeContract[];
	user: UserContract;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export type OwnProps = LensRendererProps;

type Props = StateProps & DispatchProps & OwnProps & Setup;

interface State {
	users: null | UserContract[];
	searchTerm: string;
	submitting: boolean;
	redirectTo: null | string;
}

export default withSetup(
	class CreateView extends React.Component<Props, State> {
		constructor(props) {
			super(props);

			this.state = {
				searchTerm: '',
				users: null,
				submitting: false,
				redirectTo: null,
			};

			this.close = this.close.bind(this);
			this.createView = this.createView.bind(this);
			this.handleSearchTermChange = this.handleSearchTermChange.bind(this);
			this.loadUsers = _.debounce(this.loadUsers.bind(this), 500) as any;
		}

		componentDidMount() {
			try {
				this.loadUsers();
			} catch (error) {
				console.error(error);
			}
		}

		async createView(event) {
			const { sdk, user } = this.props;
			const id = event.currentTarget.dataset.userid;

			const targetUser = _.find(this.state.users, {
				id,
			});

			if (!targetUser) {
				return;
			}

			this.setState({
				submitting: true,
			});

			// Sort the user slugs here, so that the view slug and markers are always
			// the same, no matter who initiates the view creation
			const slugs = [user.slug, targetUser.slug].sort();

			const compoundMarker = slugs.join('+');

			// Use existing view if one is found
			const views = await sdk.query({
				type: 'object',
				required: ['type', 'data', 'markers'],
				properties: {
					type: {
						const: 'view@1.0.0',
					},
					data: {
						type: 'object',
						required: ['dms'],
						properties: {
							dms: {
								const: true,
							},
						},
					},
					markers: {
						type: 'array',
						contains: {
							const: compoundMarker,
						},
					},
				},
			});
			if (views.length > 0) {
				this.setState({
					submitting: false,
				});
				this.handleDone(views[0]);
				return this.close();
			}

			const view = {
				type: 'view',
				name: `${slugs[0].replace('user-', '')} - ${slugs[1].replace(
					'user-',
					'',
				)}`,
				// Add a compound marker, which will only allow yourself of the target
				// user to see the view
				markers: [compoundMarker],
				data: {
					dms: true,
					actors: slugs,
					allOf: [
						{
							name: 'Marked threads',
							schema: {
								$$links: {
									'has attached element': {
										type: 'object',
										properties: {
											type: {
												enum: [
													'message@1.0.0',
													'update@1.0.0',
													'create@1.0.0',
													'whisper@1.0.0',
												],
											},
										},
										additionalProperties: true,
									},
								},
								type: 'object',
								properties: {
									type: {
										type: 'string',
										const: 'thread@1.0.0',
									},
									markers: {
										type: 'array',
										items: {
											// The view should only return threads that have the same
											// compound marker
											const: compoundMarker,
										},
										minItems: 1,
									},
									id: {
										type: 'string',
									},
									slug: {
										type: 'string',
									},
								},
								additionalProperties: true,
								required: ['id', 'type', 'slug', 'markers'],
							},
						},
					],
				},
			};

			sdk.card
				.create(view)
				.then((card) => {
					if (card) {
						this.props.analytics.track('element.create', {
							element: {
								type: card.type,
							},
						});
					}
					this.handleDone(card || null);
				})
				.finally(() => {
					this.setState({
						submitting: false,
					});
				})
				.catch((error) => {
					notifications.addNotification('danger', error.message);
				});
		}

		close() {
			this.props.actions.removeChannel(this.props.channel);
		}

		handleDone(newCard) {
			const onDone = this.props.channel.data?.head?.onDone;

			if (!onDone) {
				return;
			}

			if (onDone.action === 'open') {
				this.setState({
					redirectTo: `/${newCard.slug || newCard.id}`,
				});

				return;
			}
		}

		handleSearchTermChange(event) {
			const term = event.target.value;
			this.setState({
				searchTerm: term,
			});

			try {
				this.loadUsers();
			} catch (error) {
				console.error(error);
			}
		}

		async loadUsers() {
			const { searchTerm } = this.state;
			const { sdk, allTypes } = this.props;

			const userType = _.find(allTypes, {
				slug: 'user',
			});

			if (!userType) {
				return;
			}

			const linksQuery = {
				$$links: {
					'is member of': {
						type: 'object',
						properties: {
							slug: {
								// TODO: Don't hardcode the org, and instead infer it from the user
								const: 'org-balena',
							},
						},
					},
				},
			};

			const searchQueryFilter: any = searchTerm
				? helpers.createFullTextSearchFilter(userType.data.schema, searchTerm, {
						fullTextSearchFieldsOnly: true,
				  }) || {
						anyOf: [],
				  }
				: {};

			if (searchTerm) {
				searchQueryFilter.anyOf.push({
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							regexp: {
								pattern: helpers.regexEscape(searchTerm),
								flags: 'i',
							},
						},
					},
				});
			}

			const query = skhema.merge([
				linksQuery,
				{
					type: 'object',
					properties: {
						type: {
							const: 'user@1.0.0',
						},
					},
					additionalProperties: true,
				},
				searchQueryFilter,
			]);

			const users = await sdk.query<UserContract>(query as JsonSchema, {
				sortBy: 'slug',
			});

			this.setState({
				users,
			});
		}

		render() {
			const { redirectTo, searchTerm, users, submitting } = this.state;

			const { card, channel } = this.props;

			if (redirectTo) {
				return <Redirect push to={redirectTo} />;
			}

			return (
				<CardLayout
					noActions
					overflowY
					onClose={this.close}
					card={card}
					channel={channel}
					title={<Heading.h4>Create a private conversation</Heading.h4>}
				>
					{Boolean(submitting) && (
						<Box my={2} p={3}>
							<Icon spin name="cog" />
						</Box>
					)}

					{!submitting && (
						<Box p={3}>
							<Input
								placeholder="Search for users"
								value={searchTerm}
								data-test="private-conversation-search-input"
								onChange={this.handleSearchTermChange}
							/>

							{!users && <Icon name="cog" spin />}

							{Boolean(users) &&
								_.map(users, (user) => {
									const name = _.compact([
										_.get(user, ['data', 'profile', 'name', 'first']),
										_.get(user, ['data', 'profile', 'name', 'last']),
									])
										.join(' ')
										.trim();
									return (
										<UserRow
											key={user.id}
											py={2}
											data-userid={user.id}
											data-test={`private-conversation-${user.slug}`}
											onClick={this.createView}
										>
											<Flex>
												<UserAvatar emphasized user={user} />
												<Box ml={2}>
													<Txt>
														<Txt.span bold>
															{helpers.username(user.slug)}
														</Txt.span>
														{name ? <Txt.span ml={1}>({name})</Txt.span> : null}
													</Txt>
													<Txt italic>{user.data.email}</Txt>
												</Box>
											</Flex>
										</UserRow>
									);
								})}

							{!!users && users.length === 0 && (
								<Txt p={3}>
									Your search - <strong>{searchTerm}</strong> - did not match
									any users.
								</Txt>
							)}
						</Box>
					)}
				</CardLayout>
			);
		}
	},
);
