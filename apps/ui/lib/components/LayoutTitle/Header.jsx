/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Heading
} from 'rendition'

export const Header = (card) => {
	return <Heading.h4>{card.name || card.slug || card.type}</Heading.h4>
}
