/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy';
import { circularDeepEqual } from 'fast-equals';
import * as jsonpatch from 'fast-json-patch';
import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import * as redux from 'redux';
import styled from 'styled-components';
import { Box, Button, Flex, Heading, Form } from 'rendition';
import {
	notifications,
	FreeFieldForm,
	helpers,
} from '@balena/jellyfish-ui-components';
import CardLayout from '../../layouts/CardLayout';
import * as skhema from 'skhema';
import { actionCreators, analytics, sdk } from '../../core';
import { getUiSchema, UI_SCHEMA_MODE } from '../schema-util';

const FormBox = styled(Box)`
	overflow-y: auto;
`;

export class EditLens extends React.Component<any, any> {
	constructor(props) {
		super(props);

		const { types, card } = this.props.channel.data.head;

		const cardType = helpers.getType(card.type, types);

		// Omit known computed values from the schema
		const schema = _.omit(cardType ? cardType.data.schema : {}, [
			'properties.data.properties.participants',
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser',
			'properties.data.properties.mentionsGroup',
			'properties.data.properties.alertsGroup',
			'properties.data.properties.totalValue',

			// Omit user password object
			// TODO: replace this with dynamic comparison against user permissions
			// see: https://github.com/resin-io/jellyfish/issues/390
			'properties.data.properties.password',
		]);

		// Always show specific base card fields
		const baseCardType = helpers.getType('card', types);
		_.set(
			schema,
			['properties', 'loop'],
			baseCardType.data.schema.properties.loop,
		);

		this.state = {
			// Omit known immutable values
			editModel: _.omit(clone(card), ['id', 'slug']),
			schema,
		};

		this.updateEntry = this.updateEntry.bind(this);
		this.setFreeFieldData = this.setFreeFieldData.bind(this);
		this.setLocalSchema = this.setLocalSchema.bind(this);
		this.close = this.close.bind(this);
		this.handleFormChange = this.handleFormChange.bind(this);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return !(
			circularDeepEqual(nextProps, this.props) &&
			circularDeepEqual(nextState, this.state)
		);
	}

	close() {
		this.props.actions.removeChannel(this.props.channel);
	}

	updateEntry() {
		const { card, onDone } = this.props.channel.data.head;

		const updatedEntry = helpers.removeUndefinedArrayItems(
			_.assign({}, card, this.state.editModel),
		);
		const { id, type } = card;

		const patch = jsonpatch.compare(card, updatedEntry);

		sdk.card
			.update(id, type, patch)
			.then(() => {
				analytics.track('element.update', {
					element: {
						id,
						type,
					},
				});
			})
			.then(() => {
				notifications.addNotification('success', 'Card updated');
			})
			.catch((error) => {
				notifications.addNotification('danger', error.message);
			});

		if (onDone.action === 'close') {
			this.close();
		}
	}

	handleFormChange(data) {
		this.setState({
			editModel: data.formData,
		});
	}

	setFreeFieldData(data) {
		const model = clone(this.state.editModel);
		_.forEach(data, (value, key) => {
			_.set(model, ['data', key], value);
		});
		this.setState({
			editModel: model,
		});
	}

	setLocalSchema(schema) {
		const model = clone(this.state.editModel);
		_.set(model, ['data', '$$localSchema'], schema);
		this.setState({
			editModel: model,
		});
	}

	// TODO: Homogenise form rendering between the create and edit lenses
	render() {
		const { editModel } = this.state;
		const localSchema = helpers.getLocalSchema(editModel);
		const { types, card } = this.props.channel.data.head;

		const freeFieldData = _.reduce(
			localSchema.properties,
			(carry, _value, key) => {
				const cardValue = _.get(editModel, ['data', key]);
				if (cardValue) {
					carry[key] = cardValue;
				}
				return carry;
			},
			{},
		);

		const cardType = helpers.getType(card.type, types);

		const uiSchema = getUiSchema(cardType, UI_SCHEMA_MODE.edit);

		const schema = this.state.schema;

		// Always show tags input
		if (!schema.properties.tags) {
			_.set(schema, ['properties', 'tags'], {
				type: 'array',
				items: {
					type: 'string',
				},
			});
		}

		const isValid =
			skhema.isValid(
				this.state.schema,
				helpers.removeUndefinedArrayItems(editModel),
			) &&
			skhema.isValid(
				localSchema,
				helpers.removeUndefinedArrayItems(freeFieldData),
			);

		return (
			<CardLayout
				noActions
				onClose={this.close}
				card={card}
				channel={this.props.channel}
				title={
					<Heading.h4>
						<em>Edit</em> {card.name || card.type}
					</Heading.h4>
				}
			>
				<Flex flexDirection="column" minHeight={0}>
					<FormBox p={3}>
						<Form
							uiSchema={uiSchema}
							schema={schema}
							value={editModel}
							onFormChange={this.handleFormChange}
							hideSubmitButton={true}
						/>

						<FreeFieldForm
							schema={localSchema}
							data={freeFieldData}
							onDataChange={this.setFreeFieldData}
							onSchemaChange={this.setLocalSchema}
						/>
					</FormBox>
					<Flex justifyContent="flex-end" my={3}>
						<Button onClick={this.close} mr={2}>
							Cancel
						</Button>

						<Button
							primary
							disabled={!isValid}
							onClick={this.updateEntry}
							data-test="card-edit__submit"
						>
							Submit
						</Button>
					</Flex>
				</Flex>
			</CardLayout>
		);
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['removeChannel']),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-edit',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'edit',
		renderer: connect(null, mapDispatchToProps)(EditLens),
		icon: 'pencil',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};
