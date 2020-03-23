/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'

export default function CardLoader ({
	card,
	id,
	type,
	withLinks,
	getCard,
	children
}) {
	if (typeof children !== 'function') {
		throw new Error('CardLoader only accepts a function as a child')
	}
	React.useEffect(() => {
		if (!card) {
			getCard(id, type, withLinks)
		}
	}, [ id ])
	return children ? children(card) : null
}
