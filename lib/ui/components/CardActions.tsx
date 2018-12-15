import * as copy from 'copy-to-clipboard';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button, Flex, Link, Modal } from 'rendition';
import { Form } from 'rendition/dist/unstable';
import * as skhema from 'skhema';
import styled from 'styled-components';
import { Card, Type } from '../../types';
import { CardCreator } from '../components/CardCreator';
import { FreeFieldForm } from '../components/FreeFieldForm';
import { LINKS } from '../constants';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import { getLocalSchema, removeUndefinedArrayItems } from '../services/helpers';
import { createLink } from '../services/link';
import { CardLinker } from './CardLinker';
import { ContextMenu } from './ContextMenu';
import Icon from './Icon';

const EllipsisButton = styled(Button)`
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: #333;
	}
`;

const ActionLink = styled(Link)`
	display: block !important;
	cursor: pointer;
`;

interface CardActionsState {
	showEditModal: boolean;
	showDeleteModal: boolean;
	editModel: {[key: string]: any };
	showMenu: boolean;
	schema: JSONSchema6;
	showCreateProductIssue: boolean;
}

interface CardActionProps {
	actions: typeof actionCreators;
	card: Card;
	types: Type[];
}

class Base extends React.Component<
	CardActionProps,
	CardActionsState
> {
	constructor(props: CardActionProps) {
		super(props);

		const cardType = _.find(this.props.types, { slug: this.props.card.type });

		// Omit known computed values from the schema
		const schema = _.omit(cardType ? cardType.data.schema : {}, [
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser',

			// Omit user password object
			// TODO: replace this with dynamic comparison against user permissions
			// see: https://github.com/resin-io/jellyfish/issues/390
			'properties.data.properties.password',
		]);


		this.state = {
			showEditModal: false,
			showDeleteModal: false,
			showCreateProductIssue: false,
			showMenu: false,
			editModel: {},
			schema,
		};
	}

	public delete = () => {
		sdk.card.remove(this.props.card.id, this.props.card.type)
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});

		this.setState({ showDeleteModal: false });
	}

	public doneCreatingCard = (newCard: Card | null) => {
		const { card } = this.props;
		if (!newCard) {
			return;
		}

		const linkName = LINKS[card.type]['issue'];

		createLink(this.props.card, newCard, linkName as any);

		this.setState({
			showCreateProductIssue: false,
		});
	}

	public updateEntry = () => {
		const updatedEntry = removeUndefinedArrayItems(_.assign({}
			this.props.card,
			this.state.editModel,
		));

		const { id, type } = this.props.card;

		sdk.card.update(id, updatedEntry)
			.then(() => {
				analytics.track('element.update', {
					element: {
						id,
						type,
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message);
			});

		this.setState({
			showEditModal: false,
			editModel: {},
		});
	}

	public edit = () => {
		this.setState({
			showEditModal: true,
			// Omit known immutable values
			editModel: _.omit(_.cloneDeep(this.props.card), ['id', 'slug']),
		});
	}

	public cancelEdit = () => {
		this.setState({
			showEditModal: false,
			editModel: {},
		});
	}

	public copyPermalink = (event: React.MouseEvent<HTMLElement>) => {
		event.preventDefault();
		event.stopPropagation();
		copy(`${window.location.origin}/#/${this.props.card.id}`);
	}

	public toggleMenu = () => {
		this.setState({ showMenu: !this.state.showMenu });
	}

	public toggleDeleteModal = () => {
		this.setState({ showDeleteModal: !this.state.showDeleteModal });
	}

	public handleFormChange = (data: any) => {
		this.setState({ editModel: data.formData });
	}

	public setFreeFieldData = (data: any) => {
		const model = this.state.editModel;
		_.forEach(data, (value, key) => {
			_.set(model, ['data', key], value);
		});

		this.setState({ editModel: model });
	}

	public setLocalSchema = (schema: JSONSchema6) => {
		const model = this.state.editModel;
		_.set(model, ['data', '$$localSchema'], schema);

		this.setState({ editModel: model });
	}

	public createProductIssue = () => {
		this.setState({ showCreateProductIssue: true });
	}

	public render(): React.ReactNode {
		const issueType = _.find(this.props.types, { slug: 'issue' });
		const localSchema = getLocalSchema(this.state.editModel);
		const freeFieldData = _.reduce<any, any>(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(this.props.card, ['data', key]);
			if (cardValue) {
				carry[key] = cardValue;
			}

			return carry;

		}, {});

		const uiSchema: any = _.get(this.state.schema, [ 'properties', 'name' ]) ?
			{ 'ui:order': [ 'name', '*' ] }
			: {};

		const isValid = skhema.isValid(this.state.schema, removeUndefinedArrayItems(this.state.editModel)) &&
			skhema.isValid(localSchema, removeUndefinedArrayItems(freeFieldData));

		return (
			<React.Fragment>
				<Flex align="right" justify="flex-end" mb={3}>
					<Button
						plaintext
						square={true}
						mr={1}
						onClick={this.edit}
						className="card-actions__btn--edit"
					>
						<Icon name="pencil-alt" />
					</Button>

					<CardLinker types={this.props.types} card={this.props.card} />

					<EllipsisButton
						px={2}
						mr={-1}
						plaintext
						onClick={this.toggleMenu}
					>
						<Icon name="ellipsis-v" />

						{this.state.showMenu &&
							<ContextMenu
								position="bottom"
								onClose={this.toggleMenu}
							>
								<>
									<ActionLink
										mb={2}
										onClick={this.copyPermalink}
										tooltip={{
											text: 'Permalink copied!',
											trigger: 'click',
										}}
									>
										Copy permalink
									</ActionLink>

									<ActionLink
										onClick={this.toggleDeleteModal}
									>
										Delete
									</ActionLink>

									{(this.props.card.type === 'support-thread') && (
										<ActionLink
											mt={2}
											onClick={this.createProductIssue}
										>
											Create product issue
										</ActionLink>
									)}
								</>
							</ContextMenu>
						}
					</EllipsisButton>

				</Flex>

				{this.state.showDeleteModal &&
					<Modal
						title="Are you sure you want to delete this item?"
						cancel={this.toggleDeleteModal}
						done={this.delete}
					/>
				}

				{this.state.showEditModal &&
					<Modal
						w={1060}
						cancel={this.cancelEdit}
						done={this.updateEntry}
						primaryButtonProps={{
							className: 'card-edit-modal__submit',
							disabled: !isValid,
						}}
					>
						<Form
							uiSchema={uiSchema}
							schema={this.state.schema}
							value={this.state.editModel}
							onFormChange={this.handleFormChange}
							hideSubmitButton={true}
						/>

						<FreeFieldForm
							schema={localSchema}
							data={freeFieldData}
							onDataChange={this.setFreeFieldData}
							onSchemaChange={this.setLocalSchema}
						/>
					</Modal>
				}

				<CardCreator
					seed={{ data: { repository: 'resin-io/hq' }}}
					show={this.state.showCreateProductIssue}
					type={issueType!}
					onCreate={this.doneCreatingCard as any}
					done={_.noop}
					cancel={() => this.setState({ showCreateProductIssue: false })}
				/>
			</React.Fragment>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const CardActions = connect(mapStateToProps, mapDispatchToProps)(Base);
