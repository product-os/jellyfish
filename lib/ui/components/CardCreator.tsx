/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Flex,
	Modal,
	Select,
	Txt
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import * as skhema from 'skhema';
import { analytics, sdk } from '../core';
import { actionCreators } from '../core/store';
import { getLocalSchema, removeUndefinedArrayItems } from '../services/helpers';
import { Card, Type } from '../types';
import { FreeFieldForm } from './FreeFieldForm';

const slugify = (value: string) => {
	return value
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-');
};

interface CardCreatorState {
	newCardModel: {[key: string]: any };
	selectedTypeTarget: Type;
}

interface CardCreatorProps {
	seed: {[key: string]: any };
	show: boolean;
	done: (card: Card | null) => void;
	cancel: () => void;
	onCreate?: () => void;
	type: Type | Type[];
	actions: typeof actionCreators;
}

class Base extends React.Component<CardCreatorProps, CardCreatorState> {
	constructor(props: CardCreatorProps) {
		super(props);

		this.state = {
			newCardModel: this.props.seed,
			selectedTypeTarget: _.isArray(this.props.type) ? _.first(this.props.type)! : this.props.type,
		};
	}

	public addEntry = () => {
		const { selectedTypeTarget } = this.state;
		if (!selectedTypeTarget) {
			return;
		}

		const newCard: Partial<Card> = removeUndefinedArrayItems({
			type: selectedTypeTarget.slug,
			...this.state.newCardModel,
		});

		if (this.props.onCreate) {
			this.props.onCreate();
		}

		if (newCard.type === 'org' && newCard.name) {
			newCard.slug = `org-${slugify(newCard.name)}`;
		}

		sdk.card.create(newCard as Card)
			.catch((error) => {
				this.props.done(null);
				this.props.actions.addNotification('danger', error.message);
			})
			.then((card) => {
				if (card) {
					analytics.track('element.create', {
						element: {
							type: card.type,
						},
					});
				}
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

	public handleTypeTargetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		this.setState({
			selectedTypeTarget: _.find(_.castArray(this.props.type), { slug: e.target.value })!,
		});
	}

	public render(): React.ReactNode {
		const { selectedTypeTarget } = this.state;
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
		const schema = _.omit((selectedTypeTarget as any).data.schema, [
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser',
		]);

		const uiSchema: any = _.get(schema, [ 'properties', 'name' ]) ?
			{ 'ui:order': [ 'name', '*' ] }
			: {};

		const isValid = skhema.isValid(schema, removeUndefinedArrayItems(this.state.newCardModel)) &&
			skhema.isValid(localSchema, removeUndefinedArrayItems(freeFieldData));

		return (
			<Modal
				w={1060}
				title={`Add ${selectedTypeTarget.name}`}
				cancel={this.props.cancel}
				done={this.addEntry}
				primaryButtonProps={{
					className: 'card-create-modal__submit',
					disabled: !isValid,
				}}
			>
				{_.isArray(this.props.type) && (
					<Flex align="center" pb={3}>
						<Txt>Create a new</Txt>

						<Select
							ml={2}
							value={selectedTypeTarget.slug}
							onChange={this.handleTypeTargetSelect}
						>
							{this.props.type.map(t => {
								return (
									<option value={t.slug} key={t.slug}>
										{t.name || t.slug}
									</option>
								);
							})}
						</Select>
					</Flex>
				)}

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
