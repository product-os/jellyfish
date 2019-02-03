/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as copy from 'copy-to-clipboard';
import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import * as Mark from 'mark.js';
import * as React from 'react';
import {
	Box,
	DefaultProps,
	Flex,
	Theme,
	Txt,
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import styled from 'styled-components';
import { ActionLink } from '../components/ActionLink';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
import { ContextMenu } from '../components/ContextMenu';
import Icon from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { tagStyle } from '../components/Tag';
import { colorHash, createPrefixRegExp, formatTimestamp } from '../services/helpers';
import { getActor } from '../services/store-helpers';
import { Card } from '../types';
import Gravatar from './Gravatar';

const tagMatchRE = createPrefixRegExp('@|#|!');

const EventButton = styled.button`
	cursor: pointer;
	border: 0;
	background: none;
	display: block;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-left: 8px;
	padding-right: 8px;
	border-left-style: solid;
	border-left-width: 3px;
`;

const EventWrapper = styled(Flex)`
	word-break: break-word;

	.event-card--actions {
		opacity: 0;
	}

	&:hover {
		.event-card--actions {
			opacity: 1;
		}
	}

	.rendition-tag-hl {
		${tagStyle}
	}

	.rendition-tag-hl--self {
		background: #FFF1C2;
		border-color: #FFC19B;
	}
`;

interface EventProps extends DefaultProps {
	card: Card;
	openChannel?: (target: string, card: any) => void;
}

interface EventState {
	actor: {
		name: string;
		email: null | string;
	};
	showMenu: boolean;
}

export class Event extends React.Component<EventProps, EventState> {
	public messageElement: HTMLElement;

	constructor(props: EventProps) {
		super(props);

		this.state = {
			actor: getActor(this.props.card.data.actor),
			showMenu: false,
		};
	}

	public shouldComponentUpdate(nextProps: EventProps, nextState: EventState): boolean {
		return !circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props);
	}

	public componentDidMount(): void {
		this.processText();
	}

	public processText(): void {
		if (!this.messageElement) {
			return;
		}

		// Modify all links in the message to open in a new tab
		// TODO: Make this an option in the rendition <Markdown /> component.
		this.messageElement.querySelectorAll('a').forEach((node) => {
			node.setAttribute('target', '_blank');
		});

		const instance = new Mark(this.messageElement);

		// TODO: Update @types/mark.js to include the 'ignoreGroups' options
		// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/31334
		instance.markRegExp(tagMatchRE, {
			element: 'span',
			className: 'rendition-tag-hl',
			ignoreGroups: 1,
		} as any);
	}

	public openChannel = () => {
		const { card, openChannel } = this.props;
		if (!openChannel) {
			return;
		}

		const target = this.getTarget(card);
		openChannel(target.id!, target as any);
	}

	public getTarget(card: Card): Partial<Card> {
		return _.get(card, [ 'links', 'is attached to', '0' ]) || card;
	}

	public getTimelineElement(card: Card): JSX.Element {
		const targetCard = _.get(card, [ 'links', 'is attached to', '0' ], {});
		if (targetCard.type === 'user') {
			return (
				<Txt
					color={Theme.colors.text.light}
				>
					<strong>{targetCard.slug.replace('user-', '')}</strong> joined
				</Txt>
			);
		}
		let text = `${targetCard.name || targetCard.slug || targetCard.type || ''}`;
		if (card.type === 'create') {
			text += ' created by';
		}
		if (card.type === 'update') {
			text += ' updated by';
		}

		return (
			<Txt
				color={Theme.colors.text.light}
			>
				<em>{text}</em> <strong>{this.state.actor.name}</strong>
			</Txt>
		);
	}

	public setMessageElement = (element: HTMLElement | null) => {
		if (element) {
			this.messageElement = element;
		}
	}

	public copyJSON = (event: React.MouseEvent<HTMLElement>) => {
		event.preventDefault();
		event.stopPropagation();
		copy(JSON.stringify(this.props.card, null, 2));
	}

	public toggleMenu = () => {
		this.setState({ showMenu: !this.state.showMenu });
	}

	public render(): React.ReactNode {
		const { card, openChannel, ...props } = this.props;

		const isMessage = card.type === 'message' || card.type === 'whisper';

		const messageStyle = card.type === 'whisper' ? {
			background: '#eee',
			borderRadius: 10,
			padding: '8px 16px',
			marginRight: 8,
			marginBottom: 8,

			// Min-width is used to stop text from overflowing the flex container, see
			// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
			minWidth: 0,
		} : {
			minWidth: 0,
		};

		return (
			<EventWrapper {...props} className={`event-card--${card.type}`}>
				<EventButton
					onClick={this.openChannel}
					style={{
						borderLeftColor: colorHash(this.getTarget(card).id!),
					}}
				>
					<Gravatar small email={this.state.actor.email} />
				</EventButton>
				<Box flex="1" style={messageStyle} pb={3} pr={3}>
					<Flex justify="space-between" mb={2}>
						<Flex mt={isMessage ? 0 : '5px'} align="center">
							{isMessage && (
								<strong>{this.state.actor.name}</strong>
							)}

							{!isMessage && this.getTimelineElement(card)}

							{!!card.data && !!card.data.timestamp &&
								<Txt
									color={Theme.colors.text.light}
									fontSize={1}
									ml="6px"
								>
									{formatTimestamp(card.data.timestamp, true)}
								</Txt>
							}
						</Flex>

						<span>
							<IconButton
								className="event-card--actions"
								px={2}
								mr={card.type === 'whisper' ? -12 : -1}
								plaintext
								onClick={this.toggleMenu}
							>
								<Icon name="ellipsis-v" />

							</IconButton>

							{this.state.showMenu &&
								<ContextMenu
									position="bottom"
									onClose={this.toggleMenu}
								>
									<>
										<ActionLink
											onClick={this.copyJSON}
											tooltip={{
												text: 'JSON copied!',
												trigger: 'click',
											}}
										>
											Copy as JSON
										</ActionLink>
									</>
								</ContextMenu>
							}
						</span>
					</Flex>

					{isMessage && !!card.data.payload.message &&
						<div ref={this.setMessageElement}>
							<Markdown
								style={{fontSize: 'inherit'}}
								className="event-card__message"
							>
								{card.data.payload.message}
							</Markdown>
						</div>
					}
					{isMessage && !!card.data.payload.file &&
						<AuthenticatedImage
							cardId={card.id}
							fileName={card.data.payload.file}
						/>
					}
				</Box>
			</EventWrapper>
		);
	}
}
