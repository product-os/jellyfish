import React from 'react';
import _ from 'lodash';
import format from 'date-fns/format';
import isSameDay from 'date-fns/isSameDay';
import { html } from 'common-tags';
import { saveAs } from 'file-saver';
import { Flex } from 'rendition';
import { parseMessage } from '../Event';
import * as helpers from '../../services/helpers';
import Icon from '../Icon';
import { PlainButton } from '../PlainButton';
import HeaderTitle from './HeaderTitle';

const getEventContent = (typeBase: string, event: any) => {
	switch (typeBase) {
		case 'update':
			if (_.some(event.data.payload, 'op')) {
				return helpers.generateJSONPatchDescription(event.data.payload);
			}
			return event.name;
		case 'message':
			return parseMessage(helpers.getMessage(event));
		case 'whisper':
			return `**whisper** ${parseMessage(helpers.getMessage(event))}`;
		default:
			return '';
	}
};

export default class Header extends React.Component<any> {
	constructor(props: any) {
		super(props);

		this.handleDownloadConversation =
			this.handleDownloadConversation.bind(this);
	}

	async handleDownloadConversation(events: any[]) {
		const { card, getActor } = this.props;
		let text = card.name;
		let activeDate: Date | null = null;

		for (const event of events) {
			const typeBase = event.type.split('@')[0];
			const content = getEventContent(typeBase, event);
			const actorCard = await getActor(event.data.actor);
			const actorName = actorCard?.name || '';
			const timestamp = new Date(
				_.get(event, ['data', 'timestamp']) || event.created_at,
			);
			const time = format(timestamp, 'HH:mm');
			let date = '';

			// Show message date if it's different from previous message date
			if (!activeDate || !isSameDay(timestamp, activeDate)) {
				date = format(timestamp, 'yyyy - MM - dd');
				activeDate = timestamp;
			}

			text += '\n\n';
			text += html` ${date} ${time} ${actorName} ${content} `;
		}

		const blob = new Blob([text], {
			type: 'text/plain',
		});

		saveAs(blob, `${card.name || card.slug}.txt`);
	}

	render() {
		const {
			headerOptions,
			hideWhispers,
			messagesOnly,
			sortedEvents,
			handleJumpToTop,
			handleWhisperToggle,
			handleEventToggle,
		} = this.props;
		return (
			<Flex mx={2} justifyContent="flex-end">
				{/* @ts-ignore */}
				<HeaderTitle flex={1} title={_.get(headerOptions, ['title'])} />
				<Flex alignItems="center" flex={0}>
					<PlainButton
						tooltip={{
							placement: 'left',
							text: 'Jump to first message',
						}}
						onClick={handleJumpToTop}
						icon={<Icon name="chevron-circle-up" />}
					/>

					{_.get(headerOptions, ['buttons', 'toggleWhispers']) !== false && (
						<PlainButton
							tooltip={{
								placement: 'left',
								text: `${hideWhispers ? 'Show' : 'Hide'} whispers`,
							}}
							style={{
								opacity: hideWhispers ? 0.5 : 1,
							}}
							onClick={handleWhisperToggle}
							icon={<Icon name="user-secret" />}
						/>
					)}

					{_.get(headerOptions, ['buttons', 'toggleEvents']) !== false && (
						<PlainButton
							tooltip={{
								placement: 'left',
								text: `${
									messagesOnly ? 'Show' : 'Hide'
								} create and update events`,
							}}
							style={{
								opacity: messagesOnly ? 0.5 : 1,
							}}
							className="timeline__checkbox--additional-info"
							onClick={handleEventToggle}
							icon={<Icon name="stream" />}
						/>
					)}

					<PlainButton
						tooltip={{
							placement: 'left',
							text: 'Download conversation',
						}}
						onClick={() => {
							return this.handleDownloadConversation(sortedEvents);
						}}
						icon={<Icon name="download" />}
					/>
				</Flex>
			</Flex>
		);
	}
}
