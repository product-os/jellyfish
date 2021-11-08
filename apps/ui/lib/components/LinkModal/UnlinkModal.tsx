/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { strict as assert } from 'assert';
import pluralize from 'pluralize';
import { Modal } from 'rendition';
import {
	linkConstraints,
	getReverseConstraint,
} from '@balena/jellyfish-client-sdk';
import { notifications, Icon, helpers } from '@balena/jellyfish-ui-components';
import {
	Contract,
	ContractSummary,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { AutoCompleteCardSelect } from '../AutoCompleteCardSelect';
import * as linkUtils from './util';
import { TypeFilter } from './TypeFilter';
import { LinkConstraint } from '@balena/jellyfish-client-sdk/build/types';

export interface UnlinkModalProps {
	actions: {
		removeLink: (
			fromCard: ContractSummary,
			toCard: ContractSummary,
			linkVerb: string,
			options: any,
		) => void;
	};
	allTypes: TypeContract[];
	cards: Contract[];
	target?: Contract;
	onHide: () => void;
}

export const UnlinkModal: React.FunctionComponent<UnlinkModalProps> = ({
	actions,
	cards,
	target,
	allTypes,
	onHide,
}) => {
	const [selectedTarget, setSelectedTarget] =
		React.useState<Contract | undefined>(target);
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
		return linkUtils.getValidTypes(allTypes, fromType, undefined, target);
	}, [allTypes, fromType, undefined, target]);

	// Get the link constraints that apply based on:
	// 1. the type of the source card
	// 2. the filtered target types
	const allLinkTypeTargets = React.useMemo(() => {
		const cardTypes = _.castArray(cardType || validTypes);
		return linkConstraints.reduce<linkUtils.LinkType[]>(
			(acc: any, constraint) => {
				if (
					constraint.data.from === fromType &&
					_.find(cardTypes, {
						slug: constraint.data.to,
					})
				) {
					// Move the data.title property to the root of the object, as the rendition Select
					// component can't use a non-root field for the `labelKey` prop
					acc.push(
						Object.assign({}, constraint, {
							title: constraint.data.title,
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
			const constraint = _.find(linkConstraints, {
				data: {
					from: helpers.getTypeBase(card.type),
					to: helpers.getTypeBase(selectedTarget.type),
				},
			});
			await actions.removeLink(card, selectedTarget, constraint!.name, {
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
			anyOf: allLinkTypeTargets.map((constraint) => {
				const revConstraint: LinkConstraint | undefined = getReverseConstraint(
					constraint.data.from,
					constraint.data.to,
					constraint.name,
				);
				const toType = helpers.getType(constraint.data.to, allTypes);
				const query = {
					type: 'object',
					required: ['type'],
					$$links: {
						[revConstraint!.name]: {
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

		const titleSource = `${pluralize('this', cards.length)} ${pluralize(
			typeName,
			cards.length,
			cards.length > 1,
		)}`;
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
