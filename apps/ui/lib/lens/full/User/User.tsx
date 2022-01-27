import React from 'react';
import _ from 'lodash';
import {
	ActionLink,
	helpers,
	notifications,
} from '@balena/jellyfish-ui-components';
import { sdk, actionCreators } from '../../../core';
import ContractRenderer from '../../common/ContractRenderer';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { core } from '@balena/jellyfish-types';

export type OwnProps = LensRendererProps;

export type StateProps = {
	balenaOrg: core.Contract;
};

export interface DispatchProps {
	actions: BoundActionCreators<
		Pick<typeof actionCreators, 'sendFirstTimeLoginLink' | 'createLink'>
	>;
}

type Props = StateProps & DispatchProps & OwnProps;

interface State {
	isOperator: boolean;
}

export default class User extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.sendFirstTimeLoginLink = this.sendFirstTimeLoginLink.bind(this);
		this.offboardUser = this.offboardUser.bind(this);
		this.state = {
			isOperator: false,
		};
	}

	componentDidMount() {
		return sdk
			.query({
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
								items: 'string',
							},
						},
					},
				},
			} as any)
			.then(([userWithRoles]) => {
				const roles: string[] = _.get(
					userWithRoles,
					['data', 'roles'],
					[],
				) as string[];
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
			user: card,
		});
	}

	async offboardUser() {
		const { card, balenaOrg } = this.props;

		// First, set the user's role
		const patches = helpers.patchPath(
			card,
			['data', 'roles'],
			['user-external-support'],
		);
		await sdk.card.update(card.id, card.type, patches);

		// And then remove them from the balena org
		await sdk.card.unlink(card, balenaOrg, 'is member of');
		notifications.addNotification(
			'success',
			`Offboarded user '${helpers.userDisplayName(card as core.UserContract)}'`,
		);
	}

	render() {
		return (
			<ContractRenderer
				{...this.props}
				actionItems={
					this.state.isOperator ? (
						<React.Fragment>
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
						</React.Fragment>
					) : null
				}
			/>
		);
	}
}
