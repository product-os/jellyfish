/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy';
import memoize from 'memoize-one';
import * as _ from 'lodash';
import Bluebird from 'bluebird';
import React from 'react';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import * as redux from 'redux';
import { Box, Button, Card, Flex, Heading, Select, Txt, Form } from 'rendition';
import styled from 'styled-components';
import {
	notifications,
	FreeFieldForm,
	helpers,
	Icon,
} from '@balena/jellyfish-ui-components';
import CardLayout from '../../layouts/CardLayout';
import * as skhema from 'skhema';
import {
	actionCreators,
	analytics,
	constants,
	sdk,
	selectors,
} from '../../core';
import Segment from '../common/Segment';
import { getUiSchema, UI_SCHEMA_MODE } from '../schema-util';
import { getRelationships } from '../common/RelationshipsTab';

const FormBox = styled(Box)`
	overflow-y: auto;
`;

const getRelationshipsBySlug = memoize((slug) => getRelationships(slug));

// 'Draft' links are stored in a map in the component's state,
// keyed by the combination of the target card type and the link verb.
const getLinkKey = (targetCardType, linkVerb) => {
	return `${targetCardType.split('@')[0]}-${helpers.slugify(linkVerb)}`;
};

const getTypes = memoize((cards) => {
	return _.uniq(_.map(cards, 'type'));
});

const getCardsType = memoize((cards) => {
	const cardTypes = getTypes(cards);
	if (cardTypes.length > 1) {
		throw new Error('All target cards must be of the same type');
	}
	return cards[0].type.split('@')[0];
});

export class CreateLens extends React.Component<any, any> {
	constructor(props) {
		super(props);

		const { types, seed, onDone } = this.props.channel.data.head;
		const { allTypes } = this.props;

		let selectedTypeTarget: any = null;
		let linkOption: any = null;

		// If the intention is to link the created card to another upon completion,
		// only show type options that are valid link targets
		if (onDone && onDone.action === 'link') {
			// If types have been specified, select the first specified type
			const from = getCardsType(onDone.targets);
			if (types) {
				selectedTypeTarget = _.first(_.castArray(types));

				linkOption = _.find(constants.LINKS, {
					data: {
						from,
						to: selectedTypeTarget.slug,
					},
				});
			} else {
				linkOption = _.find(constants.LINKS, {
					data: {
						from,
					},
				});

				selectedTypeTarget = _.find(allTypes, {
					slug: linkOption.data.to,
				});
			}
		} else {
			selectedTypeTarget = _.first(_.castArray(types));
		}

		this.state = {
			newCardModel: seed,
			selectedTypeTarget,
			links: {},
			linkOption,
		};

		this.bindMethods([
			'addEntry',
			'close',
			'handleLinkOptionSelect',
			'handleFormChange',
			'handleDone',
			'setFreeFieldData',
			'setLocalSchema',
			'saveLink',
		]);
	}

	saveLink(card, selectedTarget, linkTypeName) {
		this.setState((prevState) => {
			const key = getLinkKey(selectedTarget.type, linkTypeName);
			return update(prevState, {
				links: {
					[key]: (items) =>
						update(items || [], {
							$push: [
								{
									target: selectedTarget,
									verb: linkTypeName,
								},
							],
						}),
				},
			});
		});
	}

	bindMethods(methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this);
		});
	}

	handleFormChange(data) {
		const { seed } = this.props.channel.data.head;

		this.setState({
			newCardModel: Object.assign({}, seed, data.formData),
		});
	}

	setFreeFieldData(data) {
		const model = clone(this.state.newCardModel);
		_.forEach(data, (value, key) => {
			_.set(model, ['data', key], value);
		});
		this.setState({
			newCardModel: model,
		});
	}

	setLocalSchema(schema) {
		const model = clone(this.state.newCardModel);
		_.set(model, ['data', '$$localSchema'], schema);
		this.setState({
			newCardModel: model,
		});
	}

	addEntry() {
		const { links, selectedTypeTarget } = this.state;

		const { actions } = this.props;

		if (!selectedTypeTarget) {
			return;
		}

		const newCard = helpers.removeUndefinedArrayItems(
			_.merge(
				{
					type: selectedTypeTarget.slug,
				},
				this.state.newCardModel,
			),
		);

		if (newCard.type.split('@')[0] === 'org' && newCard.name) {
			newCard.slug = `org-${helpers.slugify(newCard.name)}`;
		}

		this.props.sdk.card
			.create(newCard)
			.catch((error) => {
				notifications.addNotification('danger', error.message);
				this.setState({
					submitting: false,
				});
			})
			.then(async (card) => {
				// Create all the links asynchronously
				const linkActions = _.reduce(
					links,
					(acc: any, targetLinks) => {
						_.map(targetLinks, ({ target, verb }) => {
							acc.push(actions.createLink(card, target, verb));
						});
						return acc;
					},
					[],
				);

				// Wait for all the links to be created
				await Bluebird.all(linkActions);

				if (card) {
					analytics.track('element.create', {
						element: {
							type: card.type,
						},
					});
				}
				await this.handleDone(card || null);
			});

		this.setState({
			submitting: true,
		});
	}

	close() {
		this.props.actions.removeChannel(this.props.channel);
	}

	handleLinkOptionSelect(payload) {
		const option = payload.value;
		const selectedTypeTarget = _.find(this.props.allTypes, {
			slug: option.data.to,
		});

		this.setState({
			newCardModel: Object.assign({}, this.props.channel.data.head.seed),
			selectedTypeTarget,
			linkOption: option,
		});
	}

	async handleDone(newCard) {
		const { onDone } = this.props.channel.data.head;

		let closed = false;

		if (_.get(onDone, ['action']) === 'open') {
			this.setState({
				redirectTo: `/${newCard.slug || newCard.id}`,
			});
		} else if (_.get(onDone, ['action']) === 'link') {
			if (onDone.onLink) {
				onDone.onLink(newCard);
			} else {
				const cards = onDone.targets;
				const { linkOption, selectedTypeTarget } = this.state;
				const createLink = async (card) => {
					return this.props.actions.createLink(card, newCard, linkOption.name, {
						skipSuccessMessage: true,
					});
				};
				if (newCard && selectedTypeTarget) {
					const linkTasks = cards.map(createLink);
					await Bluebird.all(linkTasks);
					notifications.addNotification(
						'success',
						`Created new link${cards.length > 1 ? 's' : ''}`,
					);
				}
			}
			this.close();
			closed = true;
		}
		if (!closed) {
			this.setState({
				submitting: false,
			});
		}
		if (onDone.callback) {
			onDone.callback(newCard);
		}
	}

	render() {
		const { redirectTo, selectedTypeTarget, links, linkOption } = this.state;

		const { card, channel, allTypes, actions } = this.props;

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		const localSchema = helpers.getLocalSchema(this.state.newCardModel);

		const freeFieldData = _.reduce(
			localSchema.properties,
			(carry, _value, key) => {
				const cardValue = _.get(this.state.newCardModel, ['data', key]);
				if (cardValue) {
					carry[key] = cardValue;
				}
				return carry;
			},
			{},
		);

		// Omit known computed values from the schema
		const schema = _.omit(selectedTypeTarget.data.schema, [
			'properties.data.properties.participants',
			'properties.data.properties.mentionsUser',
			'properties.data.properties.totalValue',
			'properties.data.properties.alertsUser',
			'properties.data.properties.mentionsGroup',
			'properties.data.properties.alertsGroup',
		]);

		const uiSchema = getUiSchema(selectedTypeTarget, UI_SCHEMA_MODE.create);

		const relationships = getRelationshipsBySlug(selectedTypeTarget.slug);

		// Always show specific base card fields
		const baseCardType = helpers.getType('card', allTypes);
		_.set(
			schema,
			['properties', 'loop'],
			_.merge(
				{},
				baseCardType.data.schema.properties.loop,
				selectedTypeTarget.data.schema.properties.loop,
			),
		);

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
				schema,
				helpers.removeUndefinedArrayItems(this.state.newCardModel),
			) &&
			skhema.isValid(
				localSchema,
				helpers.removeUndefinedArrayItems(freeFieldData),
			);

		const head = this.props.channel.data.head;

		let linkTypeTargets: any = null;

		if (linkOption) {
			const from = getCardsType(head.onDone.targets);

			// Create an array of available link types, then map over them and move the
			// data.title file to the root of the object, as the rendition Select
			// component can't use a non-root field for the `labelKey` prop
			// TODO make the Select component allow nested fields for the `labelKey` prop
			linkTypeTargets = _.filter(constants.LINKS, ['data.from', from]).map(
				(constraint) => {
					return Object.assign({}, constraint, {
						title: constraint.data.title,
					});
				},
			);
		}

		return (
			<CardLayout
				noActions
				onClose={this.close}
				card={card}
				channel={channel}
				data-test="create-lens"
				title={
					<Heading.h4>
						Add {linkOption ? linkOption.data.title : selectedTypeTarget.name}
					</Heading.h4>
				}
			>
				<Flex flexDirection="column" minHeight={0}>
					<FormBox px={3} flex={1}>
						{Boolean(linkOption) && (
							<Flex alignItems="center" pb={3} mt={2}>
								<Txt>Create a new</Txt>

								<Select
									ml={2}
									value={linkOption}
									onChange={this.handleLinkOptionSelect}
									options={linkTypeTargets}
									labelKey="title"
									valueKey={{
										key: 'slug',
										reduce: false,
									}}
								/>
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

						{_.map(relationships, (segment) => {
							const key = getLinkKey(segment.type, segment.link);
							return (
								<Card
									p={3}
									mt={3}
									key={key}
									data-test={`segment-card--${_.get(segment, ['type'])}`}
									title={segment.title}
								>
									<Segment
										card={selectedTypeTarget}
										segment={segment}
										types={allTypes}
										actions={actions}
										onSave={this.saveLink}
										draftCards={_.map(links[key], 'target')}
									/>
								</Card>
							);
						})}
					</FormBox>
					<Flex justifyContent="flex-end" my={3} flex={0}>
						<Button onClick={this.close} mr={2}>
							Cancel
						</Button>
						<Button
							primary
							disabled={!isValid}
							onClick={this.addEntry}
							data-test="card-creator__submit"
						>
							{this.state.submitting ? <Icon spin name="cog" /> : 'Submit'}
						</Button>
					</Flex>
				</Flex>
			</CardLayout>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		sdk,
		allTypes: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'createLink',
				'addChannel',
				'removeChannel',
				'getLinks',
				'queryAPI',
			]),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'create',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateLens),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};
