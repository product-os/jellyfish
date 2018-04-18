import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Button, Flex, Form, Modal, Txt } from 'rendition';
import { Card } from '../../Types';
import * as sdk from '../services/sdk';
import Icon from './Icon';

interface CardActionsState {
	showEditModal: boolean;
	showDeleteModal: boolean;
	editModel: {[key: string]: any };
	schema: JSONSchema6;
}

interface CardActionProps {
	card: Card;
	refresh: () => void;
	delete: () => void;
}

export default class CardActions extends React.Component<
	CardActionProps,
	CardActionsState
> {
	constructor(props: CardActionProps) {
		super(props);

		const cardType = sdk.type.get(this.props.card.type);
		const schema = cardType ? cardType.data.schema : {};

		this.state = {
			showEditModal: false,
			showDeleteModal: false,
			editModel: {},
			schema,
		};
	}

	public delete() {
		sdk.card.remove(this.props.card.id)
		.then(() => this.props.delete());

		this.setState({ showDeleteModal: false });
	}

	public updateEntry() {
		const updatedEntry = _.assign(
			_.cloneDeep(this.props.card),
			this.state.editModel,
		);

		sdk.card.update(this.props.card.id, updatedEntry)
		.then(() => this.props.refresh());

		this.setState({
			showEditModal: false,
			editModel: {},
		});
	}

	public edit() {
		this.setState({
			showEditModal: true,
			// Omit known immutable values
			editModel: _.omit(_.cloneDeep(this.props.card), ['id', 'slug']),
		});
	}

	public cancelEdit() {
		this.setState({
			showEditModal: false,
			editModel: {},
		});
	}

	public render() {
		return (
			<React.Fragment>
				<Flex align='right' justify='flex-end' mb={3}>
					<Button
						mr={2}
						onClick={() => this.edit()}
					>
						<Icon name='pencil-alt' style={{ marginRight: 10 }} />
						Edit
					</Button>

					<Button
						onClick={() => this.setState({ showDeleteModal: true })}
					>
						<Txt color='red'>
							<Icon name='trash-alt' style={{ marginRight: 10 }} />
							Delete
						</Txt>
					</Button>

				</Flex>

				{this.state.showDeleteModal &&
					<Modal
						title='Are you sure you want to delete this item?'
						cancel={() => this.setState({showDeleteModal: false})}
						done={() => this.delete()} />
				}
				{this.state.showEditModal &&
					<Modal
						cancel={() => this.cancelEdit()}
						done={() => this.updateEntry()}>
						<Form
							schema={this.state.schema}
							value={this.state.editModel}
							onChange={(data: any) => this.setState({ editModel: data.formData })}
							onSubmit={() => this.updateEntry()}
						/>
					</Modal>
				}
			</React.Fragment>
		);
	}

}
