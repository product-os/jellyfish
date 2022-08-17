import React from 'react';
import _ from 'lodash';
import { strict as assert } from 'assert';
import pluralize from 'pluralize';
import { Modal } from 'rendition';
import * as notifications from '../../services/notifications';
import * as helpers from '../../services/helpers';
import { Icon } from '../';
import type { Contract, ContractSummary, TypeContract } from 'autumndb';
import { AutoCompleteCardSelect } from '../AutoCompleteCardSelect';
import * as linkUtils from './util';
import { TypeFilter } from './TypeFilter';
import type { RelationshipContract } from 'autumndb';
import { BoundActionCreators } from '../../types';
import { actionCreators } from '../../store';

export interface StateProps {
	allTypes: TypeContract[];
	relationships: RelationshipContract[];
}
export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}
export interface OwnProps {
	cards: Contract[];
	target?: Contract;
	onHide: () => void;
}

type Props = StateProps & DispatchProps & OwnProps;

export const UnlinkModal: React.FunctionComponent<Props> = ({
	actions,
	cards,
	target,
	allTypes,
	onHide,
	relationships,
}) => {
	const [selectedTarget, setSelectedTarget] = React.useState<
		Contract | undefined
	>(target);
	const [cardType, setCardType] = React.useState<TypeContract>();
	const [submitting, setSubmitting] = React.useState(false);

	// Get and cache the type of the cards to be unlinked _from_
	const fromType = linkUtils.getCommonTypeBase(cards);
	const fromTypeContract: TypeContract = React.useMemo(() => {
		return _.find(allTypes, ['slug', fromType])!;
	}, [allTypes, fromType]);

	// Find all types that can be unlinked, based on:
	// 1. the available types
	// 2. the type of the source card(s)
	// 3. the target ('to') card (if specified)
	const validTypes = React.useMemo(() => {
		return linkUtils.getValidTypes(
			allTypes,
			relationships,
			fromType,
			undefined,
			target,
		);
	}, [allTypes, relationships, fromType, undefined, target]);

	// Get the relationships that apply based on:
	// 1. the type of the source card
	// 2. the filtered target types
	const allLinkTypeTargets = React.useMemo(() => {
		const cardTypes = _.castArray(cardType || validTypes);
		return relationships.reduce<linkUtils.LinkType[]>(
			(acc: any, relationship) => {
				if (
					(relationship.data.from.type === fromType &&
						_.find(cardTypes, {
							slug: relationship.data.to.type,
						})) ||
					(relationship.data.to.type === fromType &&
						_.find(cardTypes, {
							slug: relationship.data.from.type,
						}))
				) {
					// Move the data.title property to the root of the object, as the rendition Select
					// component can't use a non-root field for the `labelKey` prop
					acc.push(
						Object.assign({}, relationship, {
							title: relationship.data.title,
						}),
					);
				}

				return acc;
			},
			[],
		);
	}, [fromType, cardType, validTypes]);

	const onDone = React.useCallback(async () => {
		setSubmitting(true);

		assert.ok(selectedTarget);

		const unlinkCard = async (card: ContractSummary) => {
			const fromTypeBase = helpers.getTypeBase(card.type);
			const toTypeBase = helpers.getTypeBase(selectedTarget.type);
			const relationship =
				_.find(relationships, {
					data: {
						from: {
							type: fromTypeBase,
						},
						to: {
							type: toTypeBase,
						},
					},
				}) ||
				_.find(relationships, {
					data: {
						from: {
							type: toTypeBase,
						},
						to: {
							type: fromTypeBase,
						},
					},
				});
			const linkVerb =
				relationship!.data.from.type === fromTypeBase
					? relationship!.name!
					: relationship!.data.inverseName!;
			await actions.removeLink(card as Contract, selectedTarget, linkVerb, {
				skipSuccessMessage: true,
			});
		};

		const unlinkTasks = cards.map(unlinkCard);
		await Promise.all(unlinkTasks);
		notifications.addNotification(
			'success',
			`Removed ${pluralize('link', cards.length)}`,
		);
		setSubmitting(false);
		setSelectedTarget(undefined);
		onHide();
	}, [cards, actions, selectedTarget]);

	// We use a custom query callback for the AutoCompleteCardSelect
	// as we need to filter on cards that are linked to all of the specified
	// cards.
	const getLinkedCardsQuery = (value: string) => {
		return {
			type: 'object',
			anyOf: allLinkTypeTargets.map((relationship) => {
				const toType = helpers.getType(relationship.data.to.type, allTypes);
				const query = {
					type: 'object',
					required: ['type'],
					$$links: {
						[relationship!.data.inverseName!]: {
							allOf: cards.map((card) => {
								return {
									type: 'object',
									required: ['id'],
									properties: {
										id: {
											const: card.id,
										},
									},
								};
							}),
						},
					},
					properties: {
						type: {
							const: `${toType.slug}@${toType.version}`,
						},
					},
				};

				// Add full-text-search for the typed text (if set)
				if (value) {
					const filter = helpers.createFullTextSearchFilter(
						toType.data.schema,
						value,
						{
							fullTextSearchFieldsOnly: true,
							includeIdAndSlug: true,
						},
					);
					if (filter) {
						_.merge(query, filter);
					}
				}
				return query;
			}),
		};
	};

	// The title is constructed based on the props passed to the component
	const title = React.useMemo(() => {
		const typeName = fromTypeContract ? fromTypeContract.name : fromType;

		const titleSource = typeName
			? `${pluralize('this', cards.length)} ${pluralize(
					typeName,
					cards.length,
					cards.length > 1,
			  )}`
			: 'contract';
		return `Unlink ${titleSource} from another element`;
	}, [fromTypeContract, cards]);

	return (
		<Modal
			title={title}
			cancel={onHide}
			primaryButtonProps={
				{
					disabled: !selectedTarget || submitting,
					'data-test': 'card-unlinker__submit',
				} as any
			}
			action={submitting ? <Icon spin name="cog" /> : 'OK'}
			done={onDone}
		>
			{!target && validTypes.length > 1 && (
				<TypeFilter
					types={validTypes}
					activeFilter={cardType}
					onSetType={setCardType}
					mb={4}
				/>
			)}
			<AutoCompleteCardSelect
				placeholder="Search..."
				autoFocus
				getQueryFilter={getLinkedCardsQuery}
				value={selectedTarget}
				cardType={_.map(_.castArray(cardType || validTypes), 'slug')}
				isDisabled={Boolean(target)}
				onChange={setSelectedTarget}
			/>
		</Modal>
	);
};
