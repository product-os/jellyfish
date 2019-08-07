import * as React from 'react';
import ReplyIcon = require('react-icons/lib/md/reply');
import { Box, Flex, ThemeType, Txt } from 'rendition';
import styled, { ThemeProps, withTheme } from 'styled-components';
import { Item } from '../../state/reducer';
import { TimeSince } from '../TimeSince/TimeSince';

const StyledReplyIcon = styled(ReplyIcon)`
	fill: ${props => props.theme.colors.tertiary.light};
	transform: rotate(180deg);
`;

export interface ConversationListItemProps {
	item: Item;
	onClick: (item: Item) => void;
}

export class ConversationListItemBase extends React.Component<
	ConversationListItemProps & ThemeProps<ThemeType>
> {
	handleClick = () => {
		this.props.onClick(this.props.item);
	};

	render() {
		const { item, theme } = this.props;
		const conversation = item.conversation!;

		return (
			<Flex
				flexDirection="column"
				bg="white"
				p="24px 20px"
				mt="11px"
				style={{ minHeight: 120, cursor: 'pointer' }}
				onClick={this.handleClick}
			>
				{/* Header */}
				<Flex mb="12px" fontSize="12px" color={theme.colors.tertiary.light}>
					<Box flex="1">#{conversation.id}</Box>
					<TimeSince date={conversation.created_at} />
				</Flex>

				{/* Subject */}
				<Txt fontSize="13px" bold>
					{conversation.subject}
				</Txt>

				{/* Last message */}
				<Flex
					mt="8px"
					flex="1"
					style={{
						overflow: 'hidden',
					}}
				>
					<Box mr="8px" mt="-2px">
						<StyledReplyIcon size="20px" />
					</Box>
					<Box flex="1">
						<Txt
							fontSize="12px"
							whitespace="nowrap"
							style={{
								textOverflow: 'ellipsis',
							}}
						>
							{conversation.blurb || '[Empty]'}
						</Txt>
					</Box>
				</Flex>
			</Flex>
		);
	}
}

export const ConversationListItem = withTheme(ConversationListItemBase);
