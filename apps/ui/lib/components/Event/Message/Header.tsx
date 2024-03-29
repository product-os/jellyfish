import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { Theme, Flex, Txt } from 'rendition';
import type { Contract, UserContract } from 'autumndb';
import { Link } from '../../Link';
import HoverMenu, { EventContextProps } from './Context';
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
	is121?: boolean;
	context?: Contract;
}

const EventHeader = (props: EventHeaderProps) => {
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
	} = props;

	const getTimelineElement = React.useCallback(() => {
		const targetCard = _.get(card, ['links', 'is attached to', '0'], card);
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
				<strong>{actor && actor.card ? username(actor.card.slug) : ''}</strong>
			</Txt>
		);
	}, [actor, card]);

	const contextName =
		context?.type === 'notification@1.0.0' ? 'Notification' : context?.name;

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
					<Flex flexDirection="column" alignItems={'flex-start'}>
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

						{is121 && (
							<Txt color={'#B8B8B8'} mr={1}>
								1 to 1
							</Txt>
						)}
						{context && contextName && (
							<Link color={'#B8B8B8'} mr={1} append={context.slug}>
								{contextName}
							</Link>
						)}
					</Flex>
				)}

				{!squashTop && !isMessage && getTimelineElement()}
			</Flex>

			{context || is121 ? (
				<HoverMenu
					card={card}
					{...contextProps}
					isOwnMessage={isOwnMessage}
					isMessage={isMessage}
					menuOptions={false}
				/>
			) : (
				<HoverMenu
					card={card}
					{...contextProps}
					isOwnMessage={isOwnMessage}
					isMessage={isMessage}
				/>
			)}
		</HeaderWrapper>
	);
};

export default EventHeader;
