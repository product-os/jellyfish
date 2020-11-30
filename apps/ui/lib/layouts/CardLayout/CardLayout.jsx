/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	CloseButton,
	Column
} from '@balena/jellyfish-ui-components'
import React from 'react'
import {
	Flex
} from 'rendition'
import CardActions from '../../components/CardActions'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'
import Markers from '../../components/Markers'
import LayoutTitle from '../../components/LayoutTitle'

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
		flowId,
		flowPanel
	} = props

	const typeBase = card.type && card.type.split('@')[0]

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

				<LayoutTitle title={title} card={card} />

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
			{Boolean(flowId) && Boolean(flowPanel) && (
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 480
					}}
					card={card}
					channel={channel}
					flowPanel={flowPanel}
					flowId={flowId} />
			)}
		</Column>
	)
}

export default CardLayout
