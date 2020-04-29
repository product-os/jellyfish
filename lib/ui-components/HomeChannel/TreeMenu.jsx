/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import ViewLink from '../ViewLink'
import Icon from '../shame/Icon'

const TreeMenu = (props) => {
	const {
		subscriptions,
		types,
		user,
		actions,
		node
	} = props
	if (!node.children.length && node.card) {
		const card = node.card

		const activeChannelTarget = _.get(props.activeChannel, [ 'data', 'target' ])
		const isActive = card.slug === activeChannelTarget ||
			card.id === activeChannelTarget
		const activeSlice = _.get(props.activeChannel, [ 'data', 'options', 'slice' ])
		const update = props.viewNotices[card.id]
		return (
			<ViewLink
				user={user}
				subscription={subscriptions[card.id] || null}
				types={types}
				actions={actions}
				key={card.id}
				card={card}
				isActive={isActive}
				isStarred={node.isStarred}
				activeSlice={activeSlice}
				update={update}
				open={props.open}
			/>
		)
	}

	const isExpanded = node.key === 'root' || props.isExpanded(node.name)

	return (
		<Box key={node.key} data-test={`home-channel__group${node.key}`}>
			{node.name && (
				<Button
					plain
					primary
					width="100%"
					px={3}
					my={2}
					data-groupname={node.name}
					data-test={`home-channel__group-toggle--${node.key}`}
					onClick={props.toggleExpandGroup}
				>
					<Flex width="100%" justifyContent="space-between" alignItems="center">
						{node.name}
						<Icon name={`chevron-${isExpanded ? 'up' : 'down'}`}/>
					</Flex>
				</Button>
			)}

			<Box
				style={{
					display: isExpanded ? 'block' : 'none'
				}}
				pl={node.key === 'root' ? 0 : 2}
			>
				{node.children.map((child) => {
					return (
						<TreeMenu
							user={user}
							subscriptions={subscriptions}
							types={types}
							actions={actions}
							key={child.key}
							node={child}
							isExpanded={props.isExpanded}
							toggleExpandGroup={props.toggleExpandGroup}
							activeChannel={props.activeChannel}
							viewNotices={props.viewNotices}
							open={props.open}
						/>
					)
				})}
			</Box>
		</Box>
	)
}

export default TreeMenu
