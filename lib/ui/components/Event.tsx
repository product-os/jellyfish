import ColorHash = require('color-hash');
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
import { Card } from '../../types';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
import { tagStyle } from '../components/Tag';
import { createPrefixRegExp, formatTimestamp } from '../services/helpers';
import Gravatar from './Gravatar';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));
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

	.event-card--timestamp {
		color: #777;
		opacity: 0;
	}

	&:hover {
		.event-card--timestamp {
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
	users: Card[];
	card: Card;
	openChannel?: (target: string) => void;
}

interface EventState {
	actorName: string;
	actorEmail: null | string;
}

export class Event extends React.Component<EventProps, EventState> {
	public messageElement: HTMLElement;

	constructor(props: EventProps) {
		super(props);

		const actor = _.find(props.users, { id: props.card.data.actor });
		const actorName = actor ?
			actor.slug!.replace('user-', '') :
			'unknown user';
		const actorEmail = actor ?
			actor.data.email :
			null;

		this.state = {
			actorName,
			actorEmail,
		};
	}

	public shouldComponentUpdate(nextProps: EventProps): boolean {
		return !circularDeepEqual(nextProps, this.props);
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

		const id = this.getTargetId(card);
		openChannel(id);
	}

	public getTargetId(card: Card): string {
		return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id;
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
				<em>{text}</em> <strong>{this.state.actorName}</strong>
			</Txt>
		);
	}

	public setMessageElement = (element: HTMLElement | null) => {
		if (element) {
			this.messageElement = element;
		}
	}

	public render(): React.ReactNode {
		const { card, openChannel, users, ...props } = this.props;

		const isMessage = card.type === 'message' || card.type === 'whisper';

		const messageStyle = card.type === 'whisper' ? {
			background: '#eee',
			borderRadius: 10,
			padding: '8px 16px',
			marginRight: 8,

			// Min-width is used to stop text from overflowing the flex container, see
			// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
			minWidth: 0,
		} : {
			minWidth: 0,
		};

		const flexDir = card.type === 'whisper' ? 'row-reverse' : 'row';

		return (
			<EventWrapper {...props} className={`event-card--${card.type}`} flexDirection={flexDir}>
				<EventButton
					onClick={this.openChannel}
					style={{
						borderLeftColor: threadColor(this.getTargetId(card)),
					}}
				>
					<Gravatar small email={this.state.actorEmail} />
				</EventButton>
				<Box flex="1" style={messageStyle} pb={3} pr={3}>
					<Flex justify="space-between" mb={2} flexDirection={flexDir}>
						<Flex mt={isMessage ? 0 : '5px'} align="center">
							{isMessage && (
								<strong>{this.state.actorName}</strong>
							)}

							{!isMessage && this.getTimelineElement(card)}
						</Flex>

						{!!card.data && !!card.data.timestamp &&
							<Txt className="event-card--timestamp" fontSize={1}>{formatTimestamp(card.data.timestamp)}</Txt>
						}
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
