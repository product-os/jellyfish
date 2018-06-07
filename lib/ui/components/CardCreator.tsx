import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Modal,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import { Card, Type } from '../../Types';
import { sdk } from '../app';
import { connectComponent, ConnectedComponentProps } from '../services/helpers';
import { FreeFieldForm } from './FreeFieldForm';

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
		.subscribe({
			error: (error) => {
				this.props.actions.addNotification('danger', error.message);
			},
		});

		this.setState({
			newCardModel: {},
		});

		this.props.done();
	}

	public handleFormChange = (data: any) => {
		this.setState({ newCardModel: data.formData });
	}

	public setFreeFieldData = (data: any) => {
		const model = this.state.newCardModel;
		_.forEach(data, (value, key) => {
			_.set(model, ['data', key], value);
		});

		this.setState({ newCardModel: model });
	}

	public setLocalSchema = (schema: JSONSchema6) => {
		const model = this.state.newCardModel;
		_.set(model, ['data', '$$localSchema'], schema);

		this.setState({ newCardModel: model });
	}

	public render() {
		if (!this.props.show) {
			return null;
		}

		const localSchema = _.get(this.state.newCardModel, 'data.$$localSchema') || {
			type: 'object',
			properties: {},
		};
		const freeFieldData = _.reduce<any, any>(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(this.state.newCardModel, ['data', key]);
			if (cardValue) {
				carry[key] = cardValue;
			}

			return carry;

		}, {});

		// Omit known computed values from the schema
		const schema = _.omit((this.props.type as any).data.schema, [
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser',
		]);

		return (
			<Modal
				title="Add entry"
				cancel={this.props.done}
				done={this.addEntry}
			>
				<Form
					schema={schema}
					value={this.state.newCardModel}
					onFormChange={this.handleFormChange}
					onFormSubmit={this.addEntry}
					hideSubmitButton={true}
				/>

				<FreeFieldForm
					schema={localSchema}
					data={freeFieldData}
					onDataChange={this.setFreeFieldData}
					onSchemaChange={this.setLocalSchema}
				/>
			</Modal>
		);
	}
}

export const CardCreator = connectComponent<CardCreatorProps>(Base);
