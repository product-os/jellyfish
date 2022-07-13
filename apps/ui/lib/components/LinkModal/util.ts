import type { Contract, TypeContract } from 'autumndb';
import * as helpers from '../../services/helpers';
import _ from 'lodash';
import memoize from 'memoize-one';
import type { RelationshipContract } from 'autumndb';

export interface LinkType extends RelationshipContract {
	title: string;
}

const getTypes = memoize((inputCards: Contract[]): string[] => {
	return _.uniq(_.map(inputCards, 'type'));
});

export const getCommonTypeBase = memoize((cards: Contract[]): string => {
	const cardTypes = getTypes(cards);
	if (cardTypes.length > 1) {
		throw new Error('All cards must be of the same type');
	}
	let fromType = cards[0].type.split('@')[0];
	if (fromType === 'type') {
		fromType = cards[0].slug.split('@')[0];
	}
	return fromType;
});

export const getFilteredRelationships = (
	relationships: RelationshipContract[],
	fromType: string,
	linkVerb?: string,
	target?: Contract,
): LinkType[] => {
	return _.map(
		relationships.filter((relationship) => {
			if (
				relationship.data.from.type !== fromType &&
				relationship.data.to.type !== fromType
			) {
				return false;
			}
			if (
				linkVerb &&
				relationship.name !== linkVerb &&
				relationship.data.inverseName !== linkVerb
			) {
				return false;
			}
			if (
				target &&
				relationship.data.to.type !== helpers.getTypeBase(target.type) &&
				relationship.data.from.type !== helpers.getTypeBase(target.type)
			) {
				return false;
			}
			return true;
		}),
		(relationship) => {
			// Move the data.title property to the root of the object, as the rendition Select
			// component can't use a non-root field for the `labelKey` prop
			return Object.assign({}, relationship, {
				title: relationship.data.title,
			});
		},
	);
};

export const getValidTypes = (
	types: TypeContract[],
	relationships: RelationshipContract[],
	fromType: string,
	linkVerb?: string,
	target?: Contract,
): TypeContract[] => {
	const filteredRelationships = getFilteredRelationships(
		relationships,
		fromType,
		linkVerb,
		target,
	);
	const validTypes = _.reduce<TypeContract, TypeContract[]>(
		types,
		(acc, type) => {
			if (
				filteredRelationships.find((relationship) => {
					return (
						relationship.data.to.type === type.slug ||
						relationship.data.from.type === type.slug
					);
				})
			) {
				acc.push(type);
			}
			return acc;
		},
		[],
	);
	return _.sortBy(validTypes, 'name');
};
