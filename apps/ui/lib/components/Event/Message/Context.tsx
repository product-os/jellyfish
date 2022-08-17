import React from 'react';
import _ from 'lodash';
import queryString from 'query-string';
import copy from 'copy-to-clipboard';
import styled from 'styled-components';
import { Theme, Txt, Flex, Button, FlexProps } from 'rendition';
import type { Contract } from 'autumndb';
import { formatTimestamp } from '../../../services/helpers';
import Icon from '../../Icon';
import { ActionLink } from '../../ActionLink';
import { MirrorIcon } from '../../MirrorIcon';
import ContextMenu from '../../ContextMenu';
import { Reactions } from './Reactions';

interface ContextWrapperProps extends FlexProps {
	updating?: boolean;
	editing?: boolean;
	// TS-TODO
	card: Contract<{ payload: { message: string }; target: string }> & {
		pending?: boolean;
		error?: any;
	};
}

const ContextWrapper = styled(Flex)<ContextWrapperProps>`
	z-index: 2;
	padding: 2px 4px 2px 2px;
	border-radius: 6px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
	border: solid 0.5px #e8ebf2;
	position: absolute;
	right: 16px;
	bottom: -6px;
	background: #fff;
	opacity: ${(props) => {
		return props.card.pending || props.updating || props.editing ? 1 : 0;
	}};
	transition: 150ms ease-in-out opacity, 150ms ease-in-out width;
	.event-card:hover & {
		opacity: 1;
	}
`;

type EventContract = Contract<{
	payload: { message: string };
	target: string;
}> & {
	pending?: boolean;
	error?: any;
};

export interface EventContextProps {
	card: EventContract;
	menuOptions: React.ReactElement | false;
	updating?: boolean;
	editing?: boolean;
	isOwnMessage?: boolean;
	isMessage?: boolean;
	threadIsMirrored?: boolean;
	onEditMessage: React.MouseEventHandler<HTMLElement>;
	onCommitEdit: React.MouseEventHandler<HTMLElement>;
	onCancelEdit: React.MouseEventHandler<HTMLElement>;
	retry: (contract: EventContract) => any;
}

export default function EventContext({
	card,
	menuOptions,
	updating,
	editing,
	isOwnMessage,
	isMessage,
	threadIsMirrored,
	onEditMessage,
	onCommitEdit,
	onCancelEdit,
	retry,
}: React.PropsWithChildren<EventContextProps>) {
	const [showMenu, setShowMenu] = React.useState(false);
	const [showReactionMenu, setReactionMenu] = React.useState(false);
	const toggleMenu = () => {
		setShowMenu(!showMenu);
	};
	const toggleReactionMenu = () => {
		setReactionMenu(!showReactionMenu);
	};

	const timestamp = _.get(card, ['data', 'timestamp']) || card.created_at;
	const editedAt = _.get(card, ['data', 'edited_at']);

	const copyJSON: React.MouseEventHandler<HTMLElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		copy(JSON.stringify(card, null, 2));
	};

	const copyRawMessage: React.MouseEventHandler<HTMLElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		copy(card.data.payload.message);
	};

	const copyLink: React.MouseEventHandler<HTMLElement> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		const urlParams = queryString.stringify({
			...queryString.parse(_.get(location, ['search'], '')),
			event: card.id,
		});
		copy(`${_.get(location, ['origin'])}/${card.data.target}?${urlParams}`);
	};

	const wrapperProps = {
		alignItems: 'center',
		card,
		updating,
		editing,
	};

	const txtProps = {
		color: Theme.colors.text.light,
		fontSize: 1,
	};

	if (editing) {
		return (
			<ContextWrapper {...wrapperProps}>
				{updating && (
					<Txt {...txtProps} ml={1} data-test="event-header__status">
						<Icon spin name="cog" />
						<Txt.span ml={1}>updating...</Txt.span>
					</Txt>
				)}
				<Button
					px={2}
					py={1}
					plain
					primary
					data-test="event-header__btn--save-edit"
					icon={<Icon name="check" />}
					onClick={onCommitEdit}
					disabled={updating}
					tooltip={{
						placement: 'left',
						text: 'Save changes',
					}}
				/>
				<Button
					px={2}
					py={1}
					plain
					tertiary
					data-test="event-header__btn--cancel-edit"
					icon={<Icon name="undo" />}
					onClick={onCancelEdit}
					disabled={updating}
					tooltip={{
						placement: 'left',
						text: 'Cancel changes',
					}}
				/>
			</ContextWrapper>
		);
	}

	return (
		<ContextWrapper {...wrapperProps}>
			{card.pending && (
				<>
					{card.error ||
					(card.created_at || '') <
						new Date(Date.now() - 1000 * 60).toISOString() ? (
						<Txt {...txtProps} ml={1} data-test="event-header__status">
							<Button
								plain
								fontSize={1}
								onClick={() => retry(card)}
								style={{
									transform: 'translateY(1px)',
								}}
								icon={
									<Icon style={{ color: 'red', marginTop: 1 }} name="times" />
								}
							>
								<Txt.span>retry</Txt.span>
							</Button>
						</Txt>
					) : (
						<Txt {...txtProps} ml={1} data-test="event-header__status">
							<Icon spin name="cog" />
							<Txt.span ml={1}>sending...</Txt.span>
						</Txt>
					)}
				</>
			)}
			{threadIsMirrored && (
				<MirrorIcon mirrors={_.get(card, ['data', 'mirrors'])} />
			)}
			{Boolean(card.data) && Boolean(timestamp) && (
				<Txt
					data-test="event-card--timestamp"
					color={Theme.colors.text.light}
					fontSize={1}
					ml={1}
				>
					{formatTimestamp(timestamp, true)}
				</Txt>
			)}
			{Boolean(editedAt) && (
				<Txt
					data-test="event-card--edited-at"
					color={Theme.colors.text.light}
					fontSize={1}
					italic
					ml={1}
					tooltip={{
						placement: 'top',
						text: formatTimestamp(editedAt, true),
					}}
				>
					(edited)
				</Txt>
			)}
			{menuOptions !== false && (
				<React.Fragment>
					<Button
						plain
						ml={2}
						py={1}
						onClick={toggleReactionMenu}
						icon={<Icon name="smile" regular />}
					/>

					<Button
						className="event-card--actions"
						data-test="event-header__context-menu-trigger"
						px={2}
						py={1}
						ml={1}
						plain
						onClick={toggleMenu}
						icon={<Icon name="ellipsis-v" />}
					/>

					{showReactionMenu && (
						<ContextMenu position="bottom" onClose={toggleReactionMenu}>
							<Reactions message={card} />
						</ContextMenu>
					)}

					{showMenu && (
						<ContextMenu position="bottom" onClose={toggleMenu}>
							<React.Fragment>
								{isOwnMessage && !card.pending && !updating && (
									<ActionLink
										data-test="event-header__link--edit-message"
										onClick={onEditMessage}
									>
										Edit message
									</ActionLink>
								)}

								<ActionLink
									data-test="event-header__link--copy-json"
									onClick={copyJSON}
									tooltip={{
										text: 'JSON copied!',
										trigger: 'click',
									}}
								>
									Copy as JSON
								</ActionLink>

								{isMessage && (
									<ActionLink
										data-test="event-header__link--copy-raw"
										onClick={copyRawMessage}
										tooltip={{
											text: 'Message copied!',
											trigger: 'click',
										}}
									>
										Copy raw message
									</ActionLink>
								)}

								<ActionLink
									data-test="event-header__link--copy-link"
									onClick={copyLink}
									tooltip={{
										text: 'Link copied!',
										trigger: 'click',
									}}
								>
									{`Copy link to this ${card.type.split('@')[0]}`}
								</ActionLink>

								{menuOptions}
							</React.Fragment>
						</ContextMenu>
					)}
				</React.Fragment>
			)}
		</ContextWrapper>
	);
}
