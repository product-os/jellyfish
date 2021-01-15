/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	Flex,
	Heading,
	Txt
} from 'rendition'
import {
	CloseButton,
	Column
} from '@balena/jellyfish-ui-components'
import CardActions from '../../components/CardActions'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'
import {
	FLOW_IDS
} from '../../components/Flows/flow-utils'
import HandoverFlowPanel from '../../components/Flows/HandoverFlowPanel'
import Markers from '../../components/Markers'
import {
	selectors
} from '../../core'

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
		user
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
						mr={-2}
						onClick={props.onClose}
						channel={channel}
					/>
				</Flex>
			</Flex>

			<Markers card={card} />

			{children}
			<SlideInFlowPanel
				slideInPanelProps={{
					height: 480
				}}
				card={card}
				flowId={FLOW_IDS.GUIDED_HANDOVER}
			>
				<HandoverFlowPanel user={user} />
			</SlideInFlowPanel>
		</Column>
	)
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
		types: selectors.getTypes(state)
	}
}

export default connect(mapStateToProps)(CardLayout)
