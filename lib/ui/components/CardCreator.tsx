import * as React from 'react';
import {
	Modal,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import { Card, Type } from '../../Types';
import { sdk } from '../app';
import { connectComponent, ConnectedComponentProps } from '../services/helpers';

interface CardCreatorState {
	newCardModel: {[key: string]: any };
}

interface CardCreatorProps extends ConnectedComponentProps {
	show: boolean;
	done: () => void;
	type: Type;
}

class Base extends React.Component<CardCreatorProps, CardCreatorState> {
	constructor(props: CardCreatorProps) {
		super(props);

		this.state = {
			newCardModel: {},
		};
	}

	public addEntry = () => {
		if (!this.props.type) {
			return;
		}

		const newCard = {
			type: this.props.type.slug,
			...this.state.newCardModel,
		};

		sdk.card.create(newCard as Card)
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});

		this.setState({
			newCardModel: {},
		});

		this.props.done();
	}

	public handleFormChange = (data: any) => {
		this.setState({ newCardModel: data.formData });
	}

	public render() {
		if (!this.props.show) {
			return null;
		}

		return (
			<Modal
				title="Add entry"
				cancel={this.props.done}
				done={this.addEntry}
			>
				<Form
					schema={(this.props.type as any).data.schema}
					value={this.state.newCardModel}
					onFormChange={this.handleFormChange}
					onFormSubmit={this.addEntry}
					hideSubmitButton={true}
				/>
			</Modal>
		);
	}
}

export const CardCreator = connectComponent<CardCreatorProps>(Base);
