import * as copy from 'copy-to-clipboard';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button, Flex, Link, Modal } from 'rendition';
import { Form } from 'rendition/dist/unstable';
import styled from 'styled-components';
import { Card, Type } from '../../Types';
import { FreeFieldForm } from '../components/FreeFieldForm';
import { sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import { getLocalSchema } from '../services/helpers';
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
}

interface CardActionProps {
	actions: typeof actionCreators;
	card: Card;
	delete: () => void;
	refresh: () => void;
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
			showMenu: false,
			editModel: {},
			schema,
		};
	}

	public delete = () => {
		sdk.card.remove(this.props.card.id)
		.then(() => this.props.delete())
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});

		this.setState({ showDeleteModal: false });
	}

	public updateEntry = () => {
		const updatedEntry = _.assign(
			_.cloneDeep(this.props.card),
			this.state.editModel,
		);

		sdk.card.update(this.props.card.id, updatedEntry)
		.then(() => {
			this.props.refresh();
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

	public render() {
		const localSchema = getLocalSchema(this.state.editModel);
		const freeFieldData = _.reduce<any, any>(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(this.props.card, ['data', key]);
			if (cardValue) {
				carry[key] = cardValue;
			}

			return carry;

		}, {});

		const uiSchema = _.get(this.state.schema, [ 'properties', 'name' ]) ?
			{ 'ui:order': [ 'name', '*' ] }
			: {};

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
