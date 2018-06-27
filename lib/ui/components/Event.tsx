import ColorHash = require('color-hash');
import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
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
import { findUsernameById, findWordsByPrefix, formatTimestamp } from '../services/helpers';
import Icon from './Icon';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

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
    background: #efefef;
    padding: 2px 2px;
    border-radius: 3px;
    border: 1px solid #c3c3c3;
	}

	.rendition-tag-hl--self {
		background: #FFF1C2;
		border-color: #FFC19B;
	}
`;

const TIMELINE_TYPES = [
	'create',
	'update',
	'message',
];


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

	public shouldComponentUpdate(nextProps: EventProps) {
		return !circularDeepEqual(nextProps, this.props);
	}

	public componentDidMount() {
		this.highlightTags();
	}

	public componentDidUpdate() {
		this.highlightTags();
	}

	public highlightTags() {
		if (!this.messageElement) {
			return;
		}

		let sourceHtml = this.messageElement.innerHTML;

		const usernames = _.uniq(_.concat(
			findWordsByPrefix('@', sourceHtml),
			findWordsByPrefix('!', sourceHtml),
		));

		const tags = _.uniq(findWordsByPrefix('#', sourceHtml));

		if (!tags.length && !usernames.length) {
			return;
		}

		const actor = this.props.card.data.actor;

		usernames.forEach((name) => {
			const match = _.find(this.props.users, { slug: `user-${name.replace(/[@!]/, '')}` });
			if (match) {
				sourceHtml = sourceHtml.replace(
					new RegExp(`${name}`, 'g'),
					`<span class="rendition-tag-hl ${match.id === actor ? 'rendition-tag-hl--self' : ''}">$&</span>`,
				);
			}
		});

		tags.forEach((tag) => {
			sourceHtml = sourceHtml.replace(
				new RegExp(`${tag}`, 'g'),
				`<span class="rendition-tag-hl">$&</span>`,
			);
		});

		this.messageElement.innerHTML = sourceHtml;
	}

	public openChannel = () => {
		const { card, openChannel } = this.props;
		if (!openChannel) {
			return;
		}

		const id = _.get(card, 'data.target') || card.id;
		openChannel(id);
	}

	public getTimelineElement(card: Card) {
		let text = `${card.name ? card.name + ' - ' : ''}${card.type}`;
		if (card.type === 'create') {
			text = 'created by';
		}
		if (card.type === 'update') {
			text = 'updated by';
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

	public render() {
		const { card, openChannel, ...props } = this.props;

		const isMessage = card.type === 'message';
		const isTimelineCard = _.includes(TIMELINE_TYPES, card.type);

		// let icon = 'database';
		let icon = 'circle fa-xs';

		if (isMessage) {
			icon = 'comment fa-flip-horizontal';
		}

		if (!isTimelineCard) {
			icon = 'asterisk';
		}

		return (
			<EventWrapper className={`event-card--${card.type}`} {...props}>
				<Button
					plaintext={true}
					onClick={this.openChannel}
					px={2}
					mr={1}
					ml={-2}
					w={32}
				>
					<Txt color={threadColor(isTimelineCard ? card.data.target : card.id)}>
						{!!icon && <Icon name={icon} />}
					</Txt>
				</Button>
				<Box flex="1">
					{isTimelineCard &&
						<React.Fragment>
							<Flex justify="space-between" mb={2}>
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

							{isMessage &&
								<div ref={this.setMessageElement}>
									<Markdown
										style={{fontSize: 'inherit'}}
										className="event-card__message"
									>
										{card.data.payload.message}
									</Markdown>
								</div>
							}
						</React.Fragment>
					}
					{!isTimelineCard &&
						<React.Fragment>
							<Flex justify="space-between">
								<Txt bold={true}>
									{`${card.name ? card.name + ' - ' : ''}${card.type}`}
								</Txt>
								{card.data && !!card.data.timestamp &&
									<Txt className="event-card--timestamp" fontSize={1}>{formatTimestamp(card.data.timestamp)}</Txt>
								}
							</Flex>
						</React.Fragment>
					}
				</Box>
			</EventWrapper>
		);
	}
}
