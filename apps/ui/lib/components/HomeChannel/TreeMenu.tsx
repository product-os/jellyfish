/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Flex } from 'rendition';
import { Icon } from '@balena/jellyfish-ui-components';
import { selectors } from '../../core';
import ViewLink from '../ViewLink';

const TreeMenu: React.FunctionComponent<any> = ({
	activeChannel,
	viewNotices,
	subscriptions,
	userSlug,
	open,
	actions,
	node,
}) => {
	const isExpandedSelector = (state) => {
		return selectors.getSidebarIsExpanded(state, node.name);
	};
	const isExpanded = node.key === 'root' || useSelector(isExpandedSelector);

	const toggleExpandGroup = React.useCallback(() => {
		actions.setSidebarExpanded(node.name, !isExpanded);
	}, [isExpanded, node.name, actions.setSidebarExpanded]);

	if (!node.children.length && node.card) {
		const card = node.card;

		const activeChannelTarget = _.get(activeChannel, ['data', 'target']);
		const isActive =
			card.slug === activeChannelTarget || card.id === activeChannelTarget;
		const activeSlice = _.get(activeChannel, ['data', 'options', 'slice']);
		const update = viewNotices[card.id];
		return (
			<ViewLink
				userSlug={userSlug}
				subscription={subscriptions[card.id] || null}
				actions={actions}
				key={card.id}
				card={card}
				label={node.name}
				isActive={isActive}
				isStarred={node.isStarred}
				activeSlice={activeSlice}
				update={update}
				open={open}
			/>
		);
	}

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
					data-expanded={isExpanded}
					data-test={`home-channel__group-toggle--${node.key}`}
					onClick={toggleExpandGroup}
				>
					<Flex width="100%" justifyContent="space-between" alignItems="center">
						{node.name}
						<Icon name={`chevron-${isExpanded ? 'up' : 'down'}`} />
					</Flex>
				</Button>
			)}

			<Box
				style={{
					display: isExpanded ? 'block' : 'none',
				}}
				pl={node.key === 'root' ? 0 : 2}
			>
				{node.children.map((child) => {
					return (
						<TreeMenu
							userSlug={userSlug}
							subscriptions={subscriptions}
							actions={actions}
							key={child.key}
							node={child}
							activeChannel={activeChannel}
							viewNotices={viewNotices}
							open={open}
						/>
					);
				})}
			</Box>
		</Box>
	);
};

export default TreeMenu;
