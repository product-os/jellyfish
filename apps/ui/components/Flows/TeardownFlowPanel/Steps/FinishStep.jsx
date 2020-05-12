/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex,
	Card,
	List,
	Txt,
	Heading,
	Box
} from 'rendition'
import * as helpers from '../../../../../../lib/ui-components/services/helpers'

export default function FinishStep ({
	flowState
}) {
	const filteredLinks = _.filter(flowState.links, (links) => links.results && links.results.length)
	return (
		<Box>
			<Txt mb={2}>Review the details below. Only close the thread when you have fully described the user&apos;s problem
			and the solution and you have created all necessary artifacts to persist the knowledge contained in this
			support thread.</Txt>
			<Flex flexDirection="row">
				<Card small flex={1} mr={2}>
					<Heading.h5>Problem</Heading.h5>
					<Txt>{flowState.problem}</Txt>
					<Heading.h5 mt={2}>Solution</Heading.h5>
					<Txt>{flowState.solution}</Txt>
				</Card>
				<Card small flex={1} ml={2}>
					<Heading.h5>Support thread artifacts</Heading.h5>
					{ _.map(filteredLinks, (links) => {
						return (
							<Box mt={2} key={links.label} data-test={`summary--${helpers.slugify(links.label)}`}>
								<Txt bold>{links.label} ({links.results.length})</Txt>
								<List>
									{links.results.map((card) => <Txt key={card.id}>{card.name || card.slug}</Txt>)}
								</List>
							</Box>
						)
					})}
				</Card>
			</Flex>
		</Box>
	)
}
