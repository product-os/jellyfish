import type {
	Contract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import * as helpers from '../../services/helpers';
import { linkConstraints, LinkConstraint } from '@balena/jellyfish-client-sdk';
import _ from 'lodash';
import memoize from 'memoize-one';

export interface LinkType extends LinkConstraint {
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

export const getFilteredLinkConstraints = (
	fromType: string,
	linkVerb?: string,
	target?: Contract,
): LinkType[] => {
	const matcher: any = {
		data: {
			from: fromType,
		},
	};
	if (linkVerb) {
		matcher.name = linkVerb;
	}
	if (target) {
		matcher.data.to = helpers.getTypeBase(target.type);
	}
	return _.map(_.filter(linkConstraints, matcher), (linkConstraint) => {
		// Move the data.title property to the root of the object, as the rendition Select
		// component can't use a non-root field for the `labelKey` prop
		return Object.assign({}, linkConstraint, {
			title: linkConstraint.data.title,
		});
	});
};

export const getValidTypes = (
	types: TypeContract[],
	fromType: string,
	linkVerb?: string,
	target?: Contract,
): TypeContract[] => {
	const constraints = getFilteredLinkConstraints(fromType, linkVerb, target);
	const validTypes = _.reduce<TypeContract, TypeContract[]>(
		types,
		(acc, type) => {
			if (
				_.find(constraints, {
					data: {
						to: type.slug,
					},
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
