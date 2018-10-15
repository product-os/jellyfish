import ColorHash = require('color-hash');
import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import * as Mark from 'mark.js';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Theme,
	Txt,
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import styled from 'styled-components';
import { Card } from '../../Types';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
import { tagStyle } from '../components/Tag';
import { createPrefixRegExp, findUsernameById, formatTimestamp } from '../services/helpers';
import Icon from './Icon';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));
const tagMatchRE = createPrefixRegExp('@|#|!');

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

interface EventProps {
	users: Card[];
	card: Card;
	openChannel?: (target: string) => void;
	[k: string]: any;
}

export default class Event extends React.Component<EventProps, { actorName: string }> {
	public messageElement: HTMLElement;

	constructor(props: EventProps) {
		super(props);

		this.state = {
			actorName: findUsernameById(props.users, props.card.data.actor),
		};
	}

	public shouldComponentUpdate(nextProps: EventProps): boolean {
		return !circularDeepEqual(nextProps, this.props);
	}

	public componentDidMount(): void {
		this.highlightTags();
	}

	public componentDidUpdate(): void {
		this.highlightTags();
	}

	public highlightTags(): void {
		if (!this.messageElement) {
			return;
		}

		const instance = new Mark(this.messageElement);

		instance.markRegExp(tagMatchRE, {
			element: 'span',
			className: 'rendition-tag-hl',
		});
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
		return _.get(card, 'data.target') || _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id;
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
		const { card, openChannel, ...props } = this.props;

		const isMessage = card.type === 'message' || card.type === 'whisper';
		const icon = isMessage ?
			card.type === 'whisper' ? 'comment' : 'comment fa-flip-horizontal'
			: 'circle fa-xs';

		const messageStyle = card.type === 'whisper' ? {
			background: '#eee',
			borderRadius: 10,
			padding: '8px 16px',
			marginRight: 8,
			marginLeft: 16,
		} : {
			marginLeft: 16,
		};

		const flexDir = card.type === 'whisper' ? 'row-reverse' : 'row';

		return (
			<EventWrapper className={`event-card--${card.type}`} {...props} flexDirection={flexDir}>
				<Button
					plaintext={true}
					onClick={this.openChannel}
					px={2}
					mx={-2}
					w={32}
				>
					<Txt color={threadColor(this.getTargetId(card))}>
						{!!icon && <Icon name={icon} />}
					</Txt>
				</Button>
				<Box flex="1" style={messageStyle}>
					<Flex justify="space-between" mb={2} flexDirection={flexDir}>
						<Txt mt={isMessage ? 0 : '5px'}>
							{isMessage ?
								<strong>{this.state.actorName}</strong>
								: this.getTimelineElement(card)
							}
						</Txt>

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
