/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import React from 'react'
import {
	Box,
	Txt
} from 'rendition'
import Link from '../../../../../lib/ui-components/Link'
import {
	TagList
} from '../../../../../lib/ui-components/Tag'

export default class SingleResponse extends React.Component {
	shouldComponentUpdate (nextProps) {
		return !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			card
		} = this.props

		return (
			<Box pb={3} data-test="snippet--form-response" data-test-id={`snippet-form-response-${card.id}`}>
				<Txt bold={!card.linked_at.hasOwnProperty('is curated by')}>
					<Link append={card.slug || card.id}>
						{card.data.user ? `Feedback from ${card.data.user}` : card.slug}
					</Link>
				</Txt>
				<TagList
					tags={card.tags}
					mb={1}
				/>
			</Box>
		)
	}
}
