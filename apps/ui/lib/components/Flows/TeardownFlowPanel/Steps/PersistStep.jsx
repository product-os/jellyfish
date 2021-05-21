/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Card,
	Txt
} from 'rendition'
import {
	helpers
} from '@balena/jellyfish-ui-components'
import Segment from '../../../../lens/common/Segment'

const cardLinks = [
	{
		id: 'patterns',
		label: 'Patterns',
		segment: {
			title: 'Pattern',
			link: 'has attached',
			type: 'pattern'
		}
	},
	{
		id: 'githubIssues',
		label: 'GitHub issues',
		segment: {
			title: 'GitHub issue',
			link: 'support thread is attached to issue',
			type: 'issue'
		}
	},
	{
		id: 'supportIssues',
		label: 'Support issues',
		segment: {
			title: 'Support issue',
			link: 'support thread is attached to support issue',
			type: 'support-issue'
		}
	}
]

export default function PersistStep ({
	actions,
	types,
	setFlow,
	flowState: {
		card,
		links
	}
}) {
	const onCardsUpdated = (link, results) => {
		setFlow({
			links: {
				...links || {},
				[link.id]: {
					label: link.label,
					results
				}
			}
		})
	}
	return (
		<React.Fragment>
			<Txt mb={2}>Create all necessary artifacts to persist the knowledge contained in this
			support thread.
			</Txt>
			<Box>
				{cardLinks.map((link) => {
					const resultsCache = _.get(links, [ link.id, 'results' ]) || null
					return (
						<Card
							key={link.id}
							small flex={1}
							m={1}
							title={link.label}
							data-test={`segment-card--${helpers.slugify(link.label)}`}
						>
							<Box mx={-3}>
								<Segment
									card={card}
									segment={link.segment}
									types={types}
									actions={actions}
									onCardsUpdated={(results) => { onCardsUpdated(link, results) }}
									draftCards={resultsCache}
								/>
							</Box>
						</Card>
					)
				})}
			</Box>
		</React.Fragment>
	)
}
