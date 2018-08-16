import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Modal,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import { Card, Type } from '../../Types';
import { sdk } from '../core';
import { actionCreators } from '../core/store';
import { getLocalSchema } from '../services/helpers';
import { FreeFieldForm } from './FreeFieldForm';

interface CardCreatorState {
	newCardModel: {[key: string]: any };
}

interface CardCreatorProps {
	seed: {[key: string]: any };
	show: boolean;
	done: (card?: Card | null) => void;
	onCreate?: () => void;
	type: Type;
	actions: typeof actionCreators;
}

class Base extends React.Component<CardCreatorProps, CardCreatorState> {
	constructor(props: CardCreatorProps) {
		super(props);

		this.state = {
			newCardModel: this.props.seed,
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

		if (this.props.onCreate) {
			this.props.onCreate();
		}

		sdk.card.create(newCard as Card)
			.catch((error) => {
				this.props.done(null);
				this.props.actions.addNotification('danger', error.message);
			})
			.then((card) => {
					this.props.done(card || null);
			});

		this.setState({
			newCardModel: this.props.seed,
		});
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

		const localSchema = getLocalSchema(this.state.newCardModel);
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

		const uiSchema = _.get(schema, [ 'properties', 'name' ]) ?
			{ 'ui:order': [ 'name', '*' ] }
			: {};

		return (
			<Modal
				title={`Add ${this.props.type.name}`}
				cancel={this.props.done}
				done={this.addEntry}
			>
				<Form
					uiSchema={uiSchema}
					schema={schema}
					value={this.state.newCardModel}
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
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const CardCreator = connect(null, mapDispatchToProps)(Base);
