import clone from 'deep-copy';
import memoize from 'memoize-one';
import _ from 'lodash';
import Bluebird from 'bluebird';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Box, Button, Flex, Heading, Select, Txt, Form } from 'rendition';
import styled from 'styled-components';
import { FreeFieldForm, Icon, Setup, withSetup } from '../../../components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import CardLayout from '../../../layouts/CardLayout';
import * as skhema from 'skhema';
import { getUiSchema, UI_SCHEMA_MODE } from '../../schema-util';
import { getRelationships } from '../../common/RelationshipsTab';
import LinkOrCreate from '../../common/LinkOrCreate';
import ContractNavLink from '../../../components/ContractNavLink';
import {
	Contract,
	JsonSchema,
	RelationshipContract,
	TypeContract,
} from 'autumndb';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { actionCreators } from '../../../store';
import { JSONSchema7 } from 'json-schema';

const FormBox = styled(Box)`
	overflow-y: auto;
`;

const getRelationshipsBySlug = memoize(
	(relationships: RelationshipContract[], slug: string) =>
		getRelationships(relationships, slug),
);

// 'Draft' links are stored in a map in the component's state,
// keyed by the combination of the target card type and the link verb.
const getLinkKey = (targetCardType: string, linkVerb: string): string => {
	return `${targetCardType.split('@')[0]}-${helpers.slugify(linkVerb)}`;
};

// Invert provided relationship
const invertRelationship = (
	relationship: RelationshipContract,
): RelationshipContract => {
	const inverse = _.cloneDeep(relationship);
	inverse.name = relationship.data.inverseName;
	inverse.data.inverseName = relationship.name!;
	inverse.data.from.type = relationship.data.to.type;
	inverse.data.to.type = relationship.data.from.type;
	inverse.data.title = relationship.data.inverseTitle;
	inverse.data.inverseTitle = relationship.data.title;
	return inverse;
};

const getTypes = memoize((cards: Contract[]): string[] => {
	return _.uniq(_.map(cards, 'type'));
});

const getCardsType = memoize((cards: Contract[]): string => {
	const cardTypes = getTypes(cards);
	if (cardTypes.length > 1) {
		throw new Error('All target cards must be of the same type');
	}
	return cards[0].type.split('@')[0];
});

export interface StateProps {
	allTypes: TypeContract[];
	relationships: RelationshipContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export type OwnProps = LensRendererProps;

type Props = StateProps & DispatchProps & Setup & OwnProps;

interface LinkPair {
	target: Contract;
	verb: string;
}

interface State {
	newCardModel: Partial<Contract>;
	selectedTypeTarget: TypeContract | null;
	links: { [key: string]: LinkPair[] };
	linkOption: RelationshipContract | null;
	submitting: boolean;
	redirectTo?: string;
}

export default withSetup(
	class CreateLens extends React.Component<Props, State> {
		constructor(props) {
			super(props);

			// TS-TODO: fix casting
			const { seed, onDone } = this.props.channel.data.head as any;
			const { allTypes } = this.props;
			const types = (this.props.channel.data.head as any)
				.types as TypeContract[];

			let selectedTypeTarget: TypeContract | null = null;
			let linkOption: RelationshipContract | null = null;

			// If the intention is to link the created card to another upon completion,
			// only show type options that are valid link targets
			if (onDone && onDone.action === 'link') {
				// If types have been specified, select the first specified type
				const from = getCardsType(onDone.targets);
				if (types) {
					selectedTypeTarget = _.first(_.castArray(types)) || null;

					if (selectedTypeTarget) {
						linkOption =
							_.find(this.props.relationships, {
								data: {
									from: {
										type: from,
									},
									to: {
										type: selectedTypeTarget.slug,
									},
								},
							}) ||
							_.find(this.props.relationships, {
								data: {
									from: {
										type: selectedTypeTarget.slug,
									},
									to: {
										type: from,
									},
								},
							}) ||
							null;
					}

					// Handle inverse relationship case
					if (linkOption && linkOption.data.from.type !== from) {
						linkOption = invertRelationship(linkOption);
					}
				} else {
					linkOption =
						_.find(this.props.relationships, {
							data: {
								from: {
									type: from,
								},
							},
						}) ||
						_.find(this.props.relationships, {
							data: {
								to: {
									type: from,
								},
							},
						}) ||
						null;

					// Handle inverse relationship case
					if (linkOption && linkOption.data.from.type !== from) {
						linkOption = invertRelationship(linkOption);
					}

					if (linkOption) {
						const found = _.find(allTypes, {
							slug: linkOption.data.to.type,
						});
						selectedTypeTarget = found || null;
					}
				}
			} else {
				selectedTypeTarget = _.first(_.castArray(types)) || null;
			}

			this.state = {
				newCardModel: seed,
				selectedTypeTarget,
				links: {},
				linkOption,
				submitting: false,
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

		saveLink = async (
			_card,
			selectedTarget: Pick<Contract, 'id' | 'type'>,
			linkTypeName: string,
		) => {
			const fullContract = await this.props.sdk.card.get(selectedTarget.id);
			if (!fullContract) {
				return;
			}
			this.setState((prevState) => {
				const key = getLinkKey(selectedTarget.type, linkTypeName);
				const list = prevState.links[key] || [];
				list.push({
					target: fullContract,
					verb: linkTypeName,
				});
				return {
					...prevState,
					links: {
						...prevState.links,
						[key]: list,
					},
				};
			});
		};

		bindMethods(methods) {
			methods.forEach((method) => {
				this[method] = this[method].bind(this);
			});
		}

		handleFormChange(data) {
			const { seed } = this.props.channel.data.head as any;

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
						(acc: Array<Promise<void>>, targetLinks) => {
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
						this.props.analytics.track('element.create', {
							element: {
								type: card.type,
							},
						});

						await this.handleDone(card);
					}
				})
				.catch(console.error);

			this.setState({
				submitting: true,
			});
		}

		close() {
			this.props.actions.removeChannel(this.props.channel);
		}

		handleLinkOptionSelect(payload: {
			option: RelationshipContract;
			selected: number;
			target: React.ChangeEvent<HTMLElement>;
			value: RelationshipContract;
		}) {
			const option: RelationshipContract = payload.value;
			const from = getCardsType(this.props.channel.data.head?.onDone.targets);
			const targetTypeSlug =
				option.data.to.type === from
					? option.data.from.type
					: option.data.to.type;
			const selectedTypeTarget =
				_.find(this.props.allTypes, {
					slug: targetTypeSlug,
				}) || null;

			this.setState({
				newCardModel: Object.assign(
					{},
					(this.props.channel.data.head as any).seed,
				),
				selectedTypeTarget,
				linkOption: option,
			});
		}

		async handleDone(
			newCard: Pick<Contract, 'id' | 'slug' | 'version' | 'type'>,
		) {
			const { onDone } = this.props.channel.data.head as any;

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
						if (!linkOption) {
							return;
						}
						const baseType = card.type.split('@')[0];
						const linkName =
							linkOption.data.from.type === baseType
								? linkOption.name
								: linkOption.data.inverseName;
						return this.props.actions.createLink(card, newCard, linkName, {
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

			const { card, channel, allTypes, relationships } = this.props;

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

			if (!selectedTypeTarget) {
				return 'No type target found';
			}

			// Omit known computed values from the schema
			const schema: JsonSchema = _.omit(selectedTypeTarget.data.schema, [
				'properties.data.properties.participants',
				'properties.data.properties.mentionsUser',
				'properties.data.properties.totalValue',
				'properties.data.properties.alertsUser',
				'properties.data.properties.mentionsGroup',
				'properties.data.properties.alertsGroup',
			]);

			const uiSchema = getUiSchema(selectedTypeTarget, UI_SCHEMA_MODE.create);

			const linkRelationships = getRelationshipsBySlug(
				relationships,
				selectedTypeTarget.slug,
			);

			// Always show specific base card fields
			const baseCardType = helpers.getType('card', allTypes);

			const targetLoop =
				(selectedTypeTarget.data.schema?.properties as any)?.loop || {};

			_.set(
				schema,
				['properties', 'loop'],
				_.merge({}, baseCardType.data.schema.properties.loop, targetLoop),
			);

			// Always show tags input
			if (!schema?.properties?.tags) {
				_.set(schema, ['properties', 'tags'], {
					type: 'array',
					items: {
						type: 'string',
					},
				});
			}

			// Always show name input
			if (!schema?.properties?.name) {
				_.set(schema, ['properties', 'name'], {
					type: 'string',
				});
			}

			const isValid =
				skhema.isValid(
					schema as any,
					helpers.removeUndefinedArrayItems(this.state.newCardModel),
				) &&
				skhema.isValid(
					localSchema,
					helpers.removeUndefinedArrayItems(freeFieldData),
				);

			const head = this.props.channel.data.head as any;

			let linkTypeTargets: any = null;

			if (linkOption) {
				const from = getCardsType(head.onDone.targets);

				// Create an array of available link types, then map over them and move the
				// data.title file to the root of the object, as the rendition Select
				// component can't use a non-root field for the `labelKey` prop
				// TODO make the Select component allow nested fields for the `labelKey` prop
				const matchingRelationships = _.filter(this.props.relationships, [
					'data.from.type',
					from,
				]).map((constraint) => {
					return Object.assign({}, constraint, {
						title: constraint.data.title,
					});
				});

				const inverseRelationships = _.filter(this.props.relationships, [
					'data.to.type',
					from,
				]).map((constraint) => {
					return Object.assign({}, constraint, {
						title: constraint.data.inverseTitle,
					});
				});

				linkTypeTargets = matchingRelationships.concat(inverseRelationships);
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
										value={linkOption as any}
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
								schema={schema as JSONSchema7}
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

							{_.map(linkRelationships, (segment) => {
								const key = getLinkKey(segment.type, segment.link);
								const targets = _.map(links[key], 'target');
								return (
									<Box
										px={3}
										mt={3}
										key={key}
										data-test={`segment-card--${_.get(segment, ['type'])}`}
									>
										<Txt bold>{segment.title}</Txt>

										<Box py={2}>
											{_.map(targets, (target) => {
												return (
													<ContractNavLink
														key={target.id}
														contract={target}
														channel={channel}
													/>
												);
											})}
										</Box>

										<LinkOrCreate
											card={selectedTypeTarget}
											segment={segment}
											onSave={this.saveLink}
										/>
									</Box>
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
	},
);
