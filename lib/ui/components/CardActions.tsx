import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Button, Flex, Form, Modal, Text } from 'rendition';
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
}

export default class CardActions extends React.Component<
	CardActionProps,
	CardActionsState
> {
	constructor(props: CardActionProps) {
		super(props);

		const cardType = sdk.getTypeCard(this.props.card.type);
		const schema = cardType ? cardType.data.schema : {};

		this.state = {
			showEditModal: false,
			showDeleteModal: false,
			editModel: {},
			schema,
		};
	}

	public deleteEntry() {
		sdk.deleteCard(this.props.card.id)
		.then(() => this.props.refresh());

		this.setState({ showDeleteModal: false });
	}

	public updateEntry() {
		const updatedEntry = _.assign(
			_.cloneDeep(this.props.card),
			this.state.editModel,
		);

		sdk.updateCard(this.props.card.id, updatedEntry)
		.then(() => this.props.refresh());

		this.setState({
			showEditModal: false,
			editModel: {},
		});
	}

	public editEntry() {
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
						onClick={() => this.editEntry()}
					>
						<Icon name='pencil-alt' style={{ marginRight: 10 }} />
						Edit Entry
					</Button>

					<Button
						onClick={() => this.setState({ showDeleteModal: true })}
					>
						<Text color='red'>
							<Icon name='trash-alt' style={{ marginRight: 10 }} />
							Delete Entry
						</Text>
					</Button>

				</Flex>

				{this.state.showDeleteModal &&
					<Modal
						title='Are you sure you want to delete this entry?'
						cancel={() => this.setState({showDeleteModal: false})}
						done={() => this.deleteEntry()} />
				}
				{this.state.showEditModal &&
					<Modal
						title='Add entry'
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
