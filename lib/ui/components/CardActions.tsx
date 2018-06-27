import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Button, Flex, Modal, Txt } from 'rendition';
import { Form } from 'rendition/dist/unstable';
import { Card } from '../../Types';
import { sdk } from '../app';
import { FreeFieldForm } from '../components/FreeFieldForm';
import { connectComponent, ConnectedComponentProps } from '../services/connector';
import { getLocalSchema } from '../services/helpers';
import Icon from './Icon';

interface CardActionsState {
	showEditModal: boolean;
	showDeleteModal: boolean;
	editModel: {[key: string]: any };
	schema: JSONSchema6;
}

interface CardActionProps extends ConnectedComponentProps {
	card: Card;
	refresh: () => void;
	delete: () => void;
}

class Base extends React.Component<
	CardActionProps,
	CardActionsState
> {
	constructor(props: CardActionProps) {
		super(props);

		const cardType = _.find(this.props.appState.types, { slug: this.props.card.type });

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
		.then(() => this.props.refresh())
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

		return (
			<React.Fragment>
				<Flex align="right" justify="flex-end" mb={3}>
					<Button
						square={true}
						mr={2}
						onClick={this.edit}
						className="card-actions__btn--edit"
					>
						<Icon name="pencil-alt" />
					</Button>

					<Button
						square={true}
						onClick={this.toggleDeleteModal}
						className="card-actions__btn--delete"
					>
						<Txt color="red">
							<Icon name="trash-alt" />
						</Txt>
					</Button>

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
						cancel={this.cancelEdit}
						done={this.updateEntry}
						primaryButtonProps={{
							className: 'card-edit-modal__submit',
						}}
					>
						<Form
							schema={this.state.schema}
							value={this.state.editModel}
							onFormChange={this.handleFormChange}
							onFormSubmit={this.updateEntry}
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

export const CardActions = connectComponent(Base);
