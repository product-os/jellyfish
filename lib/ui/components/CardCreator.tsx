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

	public addEntry() {
		const newCard = {
			type: this.props.type.slug,
			...this.state.newCardModel,
		};

		sdk.card.add(newCard as Card)
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});

		this.setState({
			newCardModel: {},
		});

		this.props.done();
	}

	public render() {
		if (!this.props.show) {
			return null;
		}

		return (
			<Modal
				title='Add entry'
				cancel={() => this.props.done()}
				done={() => !!this.props.type && this.addEntry()}>

				<Form
					schema={(this.props.type as any).data.schema}
					value={this.state.newCardModel}
					onFormChange={(data: any) => this.setState({ newCardModel: data.formData })}
					onFormSubmit={() => !!this.props.type && this.addEntry()}
					hideSubmitButton
				/>
			</Modal>
		);
	}
}

export const CardCreator = connectComponent<CardCreatorProps>(Base);
