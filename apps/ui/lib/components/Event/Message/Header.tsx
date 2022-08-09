import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { Theme, Flex, Txt } from 'rendition';
import type { UserContract } from 'autumndb';
import { Link } from '../../Link';
import Context, { EventContextProps } from './Context';
import { username, getUserTooltipText } from '../../../services/helpers';

const HeaderWrapper = styled(Flex)`
	position: relative;
`;

const ActorPlaceholder = styled.span`
	width: 80px;
	line-height: inherit;
	background: #eee;
	display: inline-block;
	border-radius: 10px;
	text-align: center;
`;

interface EventHeaderProps extends Omit<EventContextProps, 'isOwnMessage'> {
	// TS-TODO: add actor type
	actor: any;
	user: UserContract;
	squashTop?: boolean;
	// TS-TODO
	getActorHref: (actor: any) => string;
}

export default class EventHeader extends React.Component<EventHeaderProps> {
	getTimelineElement() {
		const targetCard = _.get(
			this.props.card,
			['links', 'is attached to', '0'],
			this.props.card,
		);
		const typeBase = targetCard.type.split('@')[0];
		if (typeBase === 'user') {
			return (
				<Txt color={Theme.colors.text.light}>
					<strong>{username(targetCard.slug)}</strong> joined
				</Txt>
			);
		}
		let text = `${targetCard.name || targetCard.slug || targetCard.type || ''}`;

		if (typeBase === 'update') {
			text += ' updated by';
		} else {
			text += ' created by';
		}

		return (
			<Txt color={Theme.colors.text.light}>
				<em>{text}</em>{' '}
				<strong>
					{this.props.actor && this.props.actor.card
						? username(this.props.actor.card.slug)
						: ''}
				</strong>
			</Txt>
		);
	}

	render() {
		const {
			isMessage,
			user,
			actor,
			card,
			squashTop,
			getActorHref,
			is121,
			context,
			...contextProps
		} = this.props;

		console.log({ context, is121 });

		const contextName = context?.name;

		const isOwnMessage = user.id === _.get(card, ['data', 'actor']);

		return (
			<HeaderWrapper justifyContent="space-between">
				<Flex
					mt={isMessage ? 0 : 1}
					alignItems="center"
					style={{
						lineHeight: 1.75,
					}}
					flex={1}
					justifyContent="space-between"
				>
					{!squashTop && isMessage && (
						<Txt
							data-test="event__actor-label"
							tooltip={
								getUserTooltipText(_.get(actor, ['card']), {
									hideUsername: true,
								}) || 'loading...'
							}
						>
							{Boolean(actor) &&
								Boolean(actor.card) &&
								(() => {
									const text = (
										<Txt.span color="black">
											{username(actor.card.slug)}
										</Txt.span>
									);

									if (getActorHref) {
										return <Link to={getActorHref(actor)}>{text}</Link>;
									}

									return text;
								})()}

							{Boolean(actor) && !actor.card && (
								<Txt.span>Unknown user</Txt.span>
							)}

							{!actor && <ActorPlaceholder>Loading...</ActorPlaceholder>}
						</Txt>
					)}

					{!squashTop && !isMessage && this.getTimelineElement()}

					{!squashTop && is121 && (
						<Txt color={Theme.colors.text.light} mr={2}>
							1 to 1
						</Txt>
					)}
					{!squashTop && contextName && (
						<Txt color={Theme.colors.text.light} mr={2}>
							{contextName}
						</Txt>
					)}
				</Flex>

				<Context
					card={card}
					{...contextProps}
					isOwnMessage={isOwnMessage}
					isMessage={isMessage}
				/>
			</HeaderWrapper>
		);
	}
}
