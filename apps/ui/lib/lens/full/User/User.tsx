import React from 'react';
import _ from 'lodash';
import {
	ActionLink,
	helpers,
	notifications,
} from '@balena/jellyfish-ui-components';
import singleCardLens from '../SingleCard';

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
		return (
			<singleCardLens.data.renderer
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
