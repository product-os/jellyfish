import * as React from 'react';
import {
	Form,
	Modal,
} from 'rendition';
import { Card, Type } from '../../Types';
import { addCard } from '../services/sdk';

interface CardCreatorState {
	newCardModel: {[key: string]: any };
}

interface CardCreatorProps {
	show: boolean;
	done: () => void;
	type: Type;
}

export default class CardCreator extends React.Component<CardCreatorProps, CardCreatorState> {
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

		addCard(newCard as Card);

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
					onChange={(data: any) => this.setState({ newCardModel: data.formData })}
					onSubmit={() => !!this.props.type && this.addEntry()}
				/>
			</Modal>
		);
	}

}
