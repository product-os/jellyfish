import React from 'react';
import _ from 'lodash';
import { ActionLink, Setup } from '../../../components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { actionCreators } from '../../../store';
import { OrgContract, UserContract } from 'autumndb';

export interface StateProps {
	balenaOrg?: OrgContract;
}
export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}
export type OwnProps = LensRendererProps;

type Props = StateProps & DispatchProps & OwnProps & Setup;

interface State {
	isOperator: boolean;
}

export default class User extends React.Component<Props, State> {
	constructor(props) {
		super(props);
		this.sendFirstTimeLoginLink = this.sendFirstTimeLoginLink.bind(this);
		this.offboardUser = this.offboardUser.bind(this);
		this.state = {
			isOperator: false,
		};
	}

	componentDidMount() {
		return this.props.sdk
			.query<UserContract>({
				type: 'object',
				required: ['id', 'type', 'data'],
				properties: {
					id: {
						const: this.props.user.id,
					},
					type: {
						const: 'user@1.0.0',
					},
					data: {
						type: 'object',
						required: ['roles'],
						properties: {
							roles: {
								type: 'array',
								items: {
									type: 'string',
								},
							},
						},
					},
				},
			})
			.then(([userWithRoles]) => {
				const roles = _.get(userWithRoles, ['data', 'roles']);
				if (_.includes(roles, 'user-operator')) {
					this.setState({
						isOperator: true,
					});
				}
			});
	}

	sendFirstTimeLoginLink() {
		const { card, actions } = this.props;
		return actions.sendFirstTimeLoginLink({
			user: card as UserContract,
		});
	}

	async offboardUser() {
		const { sdk, card, balenaOrg } = this.props;

		if (!balenaOrg) {
			throw new Error('Cannot offboard member if they are not in an org');
		}

		// First, set the user's role
		const patches = helpers.patchPath(
			card,
			['data', 'roles'],
			['user-external-support'],
		);
		await sdk.card.update(card.id, card.type, patches);

		// And then remove them from the balena org
		await sdk.card.unlink(balenaOrg, card, 'has member');
		notifications.addNotification(
			'success',
			`Offboarded user '${helpers.userDisplayName(card as UserContract)}'`,
		);
	}

	render() {
		const { card, channel } = this.props;
		return (
			<TabbedContractLayout
				card={card}
				channel={channel}
				actionItems={
					this.state.isOperator ? (
						<>
							<ActionLink
								onClick={this.sendFirstTimeLoginLink}
								data-test="card-action-menu__send-first-time-login"
							>
								Send first-time login link
							</ActionLink>
							<ActionLink
								onClick={this.offboardUser}
								data-test="card-action-menu__offboard-user"
							>
								Offboard user
							</ActionLink>
						</>
					) : undefined
				}
			/>
		);
	}
}
