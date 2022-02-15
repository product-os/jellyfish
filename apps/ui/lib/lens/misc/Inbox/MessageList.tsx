import _ from 'lodash';
import path from 'path';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import styled from 'styled-components';
import {
	ActionLink,
	Column,
	Event,
	EventsContainer,
	Icon,
	withDefaultGetActorHref,
} from '@balena/jellyfish-ui-components';
import { Box, Txt, Img, Flex } from 'rendition';
import { isSameDay, isSameWeek, sub } from 'date-fns';
import { selectors, sdk } from '../../../core';

const StyledFlex = styled(Flex)(() => {
	return {
		width: '100%',
		textAlign: 'center',
		opacity: 0.8,
		flexDirection: 'column',
		alignItems: 'center',
	} as any;
});

const MessageListColumn = styled(Column)`
	position: relative;
	min-height: 0;
`;

class MessageList extends React.Component<any, any> {
	loadingPage;
	openChannel;
	scrollArea;
	scrollBottomOffset;

	constructor(props) {
		super(props);

		this.loadingPage = false;

		this.openChannel = (target) => {
			// Remove everything after the inbox channel, then append the target.
			this.props.history.push(
				path.join(window.location.pathname.split('inbox')[0], 'inbox', target),
			);
		};

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			loadingPage: false,
		};

		this.bindScrollArea = this.bindScrollArea.bind(this);
		this.handleCardRead = this.handleCardRead.bind(this);
		this.handleCardUnread = this.handleCardUnread.bind(this);
		this.handleScroll = this.handleScroll.bind(this);
	}

	async handleCardRead(event) {
		const id = event.target.dataset.cardid;

		const card = _.find(this.props.tail, {
			id,
		});

		sdk.card
			.markAsRead(
				this.props.user.slug,
				card,
				_.map(_.filter(this.props.groups, 'isMine'), 'name'),
			)
			.catch((error) => {
				console.error(error);
			});
	}

	async handleCardUnread(event) {
		const id = event.target.dataset.cardid;

		const card = _.find(this.props.tail, {
			id,
		});

		sdk.card.markAsUnread(this.props.user.slug, card).catch((error) => {
			console.error(error);
		});
	}

	async handleScroll() {
		const { scrollArea, loadingPage } = this;

		if (!scrollArea) {
			return;
		}

		this.scrollBottomOffset =
			scrollArea.scrollHeight -
			(scrollArea.scrollTop + scrollArea.offsetHeight);

		if (loadingPage) {
			return;
		}

		if (this.scrollBottomOffset > 100) {
			return;
		}

		this.loadingPage = true;
		await this.props.nextPage();
		this.loadingPage = false;
	}

	bindScrollArea(ref) {
		this.scrollArea = ref;
	}

	render() {
		let tail = this.props.tail ? this.props.tail.slice() : null;

		const { loading, loadedAllResults } = this.props;

		if (tail) {
			tail = _.sortBy(tail, 'created_at');
			tail.reverse();
		}

		// Todo: These date groupings should be replaced with a
		// proper sectionlist component
		// for example: https://github.com/lucasferreira/react-virtualized-sectionlist

		const todayCards: any[] = [];
		const yesterdayCards: any[] = [];
		const thisWeekCards: any[] = [];
		const olderCards: any[] = [];

		tail.forEach((card) => {
			const cardDate = new Date(card.data.timestamp);
			const now = new Date();
			const yesterday = sub(now, {
				days: 1,
			});

			if (isSameDay(cardDate, now)) {
				todayCards.push(card);
				return;
			}

			if (isSameDay(cardDate, yesterday)) {
				yesterdayCards.push(card);
				return;
			}

			if (isSameWeek(cardDate, now)) {
				thisWeekCards.push(card);
				return;
			}

			olderCards.push(card);
		});

		return (
			<MessageListColumn flex="1">
				<EventsContainer
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
					data-test={'messageList-ListWrapper'}
				>
					{todayCards.length > 0 && (
						<Box>
							<Box>
								<StyledFlex pb={14} pt={14}>
									<Txt>Today</Txt>
								</StyledFlex>
							</Box>
							{todayCards &&
								_.map(todayCards, (card) => {
									return (
										<Event
											data-test={'messageList-event'}
											key={card.id}
											user={this.props.user}
											groups={this.props.groups}
											openChannel={this.openChannel}
											card={card}
											getActorHref={this.props.getActorHref}
											menuOptions={
												_.includes(card.data.readBy, this.props.user.slug) ? (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardUnread}
													>
														Mark as unread
													</ActionLink>
												) : (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardRead}
													>
														Mark as read
													</ActionLink>
												)
											}
										/>
									);
								})}
						</Box>
					)}
					{yesterdayCards.length > 0 && (
						<Box>
							<Box>
								<StyledFlex pb={14} pt={14}>
									<Txt>Yesterday</Txt>
								</StyledFlex>
							</Box>
							{yesterdayCards &&
								_.map(yesterdayCards, (card) => {
									return (
										<Event
											data-test={'messageList-event'}
											key={card.id}
											user={this.props.user}
											groups={this.props.groups}
											openChannel={this.openChannel}
											card={card}
											getActorHref={this.props.getActorHref}
											menuOptions={
												_.includes(card.data.readBy, this.props.user.slug) ? (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardUnread}
													>
														Mark as unread
													</ActionLink>
												) : (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardRead}
													>
														Mark as read
													</ActionLink>
												)
											}
										/>
									);
								})}
						</Box>
					)}
					{thisWeekCards.length > 0 && (
						<Box>
							<Box>
								<StyledFlex pb={14} pt={14}>
									<Txt>This week</Txt>
								</StyledFlex>
							</Box>
							{thisWeekCards &&
								_.map(thisWeekCards, (card) => {
									return (
										<Event
											data-test={'messageList-event'}
											key={card.id}
											user={this.props.user}
											groups={this.props.groups}
											openChannel={this.openChannel}
											card={card}
											getActorHref={this.props.getActorHref}
											menuOptions={
												_.includes(card.data.readBy, this.props.user.slug) ? (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardUnread}
													>
														Mark as unread
													</ActionLink>
												) : (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardRead}
													>
														Mark as read
													</ActionLink>
												)
											}
										/>
									);
								})}
						</Box>
					)}
					{olderCards.length > 0 && (
						<Box>
							<Box>
								<StyledFlex pb={14} pt={14}>
									<Txt>Older than 1 week</Txt>
								</StyledFlex>
							</Box>
							{olderCards &&
								_.map(olderCards, (card) => {
									return (
										<Event
											data-test={'messageList-event'}
											key={card.id}
											user={this.props.user}
											groups={this.props.groups}
											openChannel={this.openChannel}
											card={card}
											getActorHref={this.props.getActorHref}
											menuOptions={
												_.includes(card.data.readBy, this.props.user.slug) ? (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardUnread}
													>
														Mark as unread
													</ActionLink>
												) : (
													<ActionLink
														data-cardid={card.id}
														onClick={this.handleCardRead}
													>
														Mark as read
													</ActionLink>
												)
											}
										/>
									);
								})}
						</Box>
					)}

					{loading && (
						<StyledFlex pb={14} pt={14}>
							<Txt>
								<Icon name="cog" spin /> Loading older messages
							</Txt>
						</StyledFlex>
					)}

					{loadedAllResults && !loading && tail.length > 0 && (
						<StyledFlex pb={14} pt={14}>
							<Txt>End of list</Txt>
						</StyledFlex>
					)}

					{!loading && tail.length === 0 && (
						<StyledFlex pb={14} pt={14}>
							<Flex px={14} maxWidth="200px" width="80vw">
								<Img src="/icons/jellyfish.svg" />
							</Flex>
							<Txt pt={14}>No messages found</Txt>
						</StyledFlex>
					)}
				</EventsContainer>
			</MessageListColumn>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state),
	};
};

export default compose<any>(
	withRouter,
	connect(mapStateToProps),
	withDefaultGetActorHref(),
)(MessageList);
