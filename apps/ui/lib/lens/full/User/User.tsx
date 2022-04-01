import React from 'react';
import _ from 'lodash';
import { ActionLink } from '../../../components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import singleCardLens from '../SingleCard';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

export default class User extends React.Component<any, any> {
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
			user: card,
		});
	}

	async offboardUser() {
		const { sdk, card, balenaOrg } = this.props;

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
			`Offboarded user '${helpers.userDisplayName(card)}'`,
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
