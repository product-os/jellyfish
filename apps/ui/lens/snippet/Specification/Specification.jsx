/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box,
	Txt
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import Link from '../../../../../lib/ui-components/Link'
import {
	TagList
} from '../../../../../lib/ui-components/Tag'

export default function SingleCard (props) {
	const {
		card
	} = props

	const blurb = _.get(card, [ 'data', 'blurb' ])

	return (
		<Box pb={3}>
			<Txt>
				<Link append={card.slug || card.id}>
					<strong>{card.name || card.slug}</strong>
				</Link>
			</Txt>

			<TagList
				tags={card.tags}
				mb={1}
			/>

			<Markdown>{blurb}</Markdown>
		</Box>
	)
}
