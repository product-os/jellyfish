import React from 'react';
import _ from 'lodash';
import { Box, Button, Flex, Heading, Txt, Form } from 'rendition';
import { Icon } from '../../../components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import * as skhema from 'skhema';
import CardLayout from '../../../layouts/CardLayout';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { OrgContract, UserContract } from 'autumndb';
import { actionCreators } from '../../../store';
import { JSONSchema7 } from 'json-schema';

const FORM_SCHEMA: JSONSchema7 = {
	type: 'object',
	required: ['email', 'username'],
	properties: {
		username: {
			type: 'string',
		},
		email: {
			type: 'string',
			format: 'email',
		},
	},
};

export interface StateProps {
	user: UserContract;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export type OwnProps = LensRendererProps;

type Props = StateProps & DispatchProps & OwnProps;

interface State {
	orgs: OrgContract[];
	submitting: boolean;
	formData: {
		username?: string;
		email?: string;
		organisation?: string;
	};
	cardIsValid: boolean;
	formSchema: JSONSchema7;
}

// TODO autogenerate this based on user creation action card
class CreateUserLens extends React.Component<Props, State> {
	constructor(props) {
		super(props);

		const { user } = this.props;

		const orgs = _.filter(_.get(user, ['links', 'is member of'], []), {
			type: 'org@1.0.0',
		});

		if (!orgs.length) {
			notifications.addNotification(
				'danger',
				'You must belong to an organisation to add new users',
			);
		}

		const formSchema = _.set(
			_.clone(FORM_SCHEMA),
			['properties', 'organisation'],
			{
				type: 'string',
				anyOf: _.map(orgs, (org) => {
					return {
						title: org.name,
						const: org.slug,
					};
				}).concat({
					title: 'No organisation',
					const: null,
				}),
			},
		);

		this.state = {
			orgs,
			submitting: false,
			formData: {},
			cardIsValid: false,
			formSchema,
		};

		this.bindMethods(['close', 'handleInputChange', 'handleOnSubmit']);
	}

	bindMethods(methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this);
		});
	}

	handleInputChange({ formData }) {
		const { formSchema } = this.state;
		this.setState({
			formData,
			cardIsValid: skhema.isValid(
				formSchema as any,
				helpers.removeUndefinedArrayItems(formData),
			),
		});
	}

	handleOnSubmit(event) {
		event.preventDefault();

		const { formData, orgs } = this.state;

		const { actions } = this.props;

		const { username, email, organisation } = formData;

		if (!username || !email || !organisation) {
			return;
		}

		this.setState(
			{
				submitting: true,
			},
			async () => {
				const success = await actions.addUser({
					username,
					email,
					org: _.find(orgs, {
						slug: formData.organisation,
					}),
				});
				this.setState({
					submitting: false,
				});
				if (success) {
					this.close();
				}
			},
		);
	}

	close() {
		this.props.actions.removeChannel(this.props.channel);
	}

	render() {
		const { orgs, formData, cardIsValid, formSchema } = this.state;

		const { card, channel } = this.props;

		return (
			<CardLayout
				noActions
				overflowY
				onClose={this.close}
				card={card}
				channel={channel}
				data-test="create-user-lens"
				title={<Heading.h4>Add User</Heading.h4>}
			>
				<Box px={3} pb={3}>
					<Form
						schema={formSchema}
						value={formData}
						onFormChange={this.handleInputChange}
						hideSubmitButton={true}
					></Form>
					<Txt mb={4}>
						On submit, your user will be created without a password. A
						first-time-login link is then sent to their email. New users can use
						this token to set their password and login
					</Txt>
					<Flex justifyContent="flex-end" mt={4}>
						<Button onClick={this.close} mr={2}>
							Cancel
						</Button>
						<Button
							primary
							type="submit"
							onClick={this.handleOnSubmit}
							disabled={!cardIsValid || !orgs.length}
							data-test="create-user-lens__submit"
						>
							{this.state.submitting ? <Icon spin name="cog" /> : 'Submit'}
						</Button>
					</Flex>
				</Box>
			</CardLayout>
		);
	}
}

export default CreateUserLens;
