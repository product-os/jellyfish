/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	CloseButton,
	Column
} from '@balena/jellyfish-ui-components'
import * as _ from 'lodash'
import React from 'react'
import {
	Flex,
	Heading,
	Txt
} from 'rendition'
import CardActions from '../../components/CardActions'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'
import Markers from '../../components/Markers'

const CardLayout = (props) => {
	const {
		inlineActionItems,
		actionItems,
		card,
		channel,
		children,
		noActions,
		overflowY,
		title,
		types,
		flowId
	} = props

	const typeBase = card.type && card.type.split('@')[0]

	const typeName = _.get(_.find(types, {
		slug: typeBase
	}), [ 'name' ], null)

	return (
		<Column
			className={`column--${typeBase || 'unknown'} column--slug-${card.slug || 'unkown'}`}
			overflowY={overflowY}
			data-test={props['data-test']}
		>
			<Flex
				p={3} pb={0}
				flexDirection={[ 'column-reverse', 'column-reverse', 'row' ]}
				justifyContent="space-between"
				alignItems="center">
				<Flex flex={1} alignSelf={[ 'flex-start', 'flex-start', 'inherit' ]} my={[ 2, 2, 0 ]}>
					{title}

					{!title && (
						<div>
							<Heading.h4>
								{card.name || card.slug || card.type}
							</Heading.h4>

							{Boolean(typeName) && (
								<Txt color="text.light" fontSize="0">{typeName}</Txt>
							)}
						</div>
					)}
				</Flex>
				<Flex alignSelf={[ 'flex-end', 'flex-end', 'flex-start' ]}>
					{!noActions && (
						<CardActions card={card} channel={channel} inlineActionItems={inlineActionItems}>
							{actionItems}
						</CardActions>
					)}
					<CloseButton
						flex={0}
						onClick={props.onClose}
						channel={channel} />
				</Flex>
			</Flex>

			<Markers card={card} />

			{children}
			<SlideInFlowPanel
				slideInPanelProps={{
					height: 480
				}}
				card={card}
				channel={channel}
				flowId={flowId} />
		</Column>
	)
}

export default CardLayout
