import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Flex, Img, Txt } from 'rendition';
import { Icon } from '../';
import { selectors } from '../../store';
import ViewLink from '../ViewLink';

const TreeMenu: React.FunctionComponent<any> = ({
	activeChannel,
	open,
	actions,
	node,
}) => {
	const isExpandedSelector = selectors.getSidebarIsExpanded(node.name);
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
		return (
			<ViewLink
				actions={actions}
				key={card.id}
				card={card}
				label={node.name}
				isActive={isActive}
				activeSlice={activeSlice}
				open={open}
			/>
		);
	}

	return (
		<Box key={node.key} data-test={`home-channel__group${node.key}`}>
			{node.name && (
				<Button
					plain
					width="100%"
					px={2}
					my={2}
					data-groupname={node.name}
					data-expanded={isExpanded}
					data-test={`home-channel__group-toggle--${node.key}`}
					onClick={toggleExpandGroup}
				>
					<Flex width="100%" justifyContent="space-between" alignItems="center">
						<Box>
							{node.icon && (
								<Txt.span
									mr={2}
									style={{
										width: 18,
										textAlign: 'center',
										display: 'inline-block',
									}}
								>
									{node.key === 'org-balena' ? (
										<Img
											src="/icons/balena.svg"
											style={{
												display: 'inline-block',
												width: 14,
												transform: 'translateY(3px)',
											}}
										/>
									) : (
										<Icon name={node.icon} regular />
									)}
								</Txt.span>
							)}
							{node.name}
						</Box>
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
							actions={actions}
							key={child.key}
							node={child}
							activeChannel={activeChannel}
							open={open}
						/>
					);
				})}
			</Box>
		</Box>
	);
};

export default TreeMenu;
