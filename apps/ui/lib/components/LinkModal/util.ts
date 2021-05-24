/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import memoize from 'memoize-one';

const getTypes = memoize((inputCards) => {
	return _.uniq(_.map(inputCards, 'type'));
});

export const getCommonTypeBase = memoize((cards) => {
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
