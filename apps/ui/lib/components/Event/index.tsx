import React from 'react';
import { compose } from 'redux';
import type { UserContract } from 'autumndb';
import { parseMessage } from './Message/Body';
import { CardLoader } from '../CardLoader';
import * as helpers from '../../services/helpers';
import withCardUpdater from '../../hocs/with-card-updater';
import { withSetup } from '../SetupProvider';
import { UPDATE, LINK } from '../constants';
import Update from './Update';
import LinkedCard from './LinkedCard';
import Message from './Message';

export { parseMessage };

const EventWithActor: React.FunctionComponent<any> = (props) => {
	const { card, user, onCardVisible, targetCard, isDirectMention } = props;
	const mentionsUserArray = card.data.payload?.mentionsUser || [];
	const directMessageMarkersArray = card.markers || [];
	// isDirectMessage is to display 1 on 1 messages in the list of notifications in Direct Mention tab
	const isDirectMessagePing =
		directMessageMarkersArray[0]?.split('+').includes(user.slug) || false;
	// isDirect checks if user is tagged in a message
	const isDirect = mentionsUserArray.includes(user.slug) || isDirectMessagePing;
	const typeBase = props.card.type.split('@')[0];
	// if isDirectMention is true, means this component is rendering for the Direct Mention tab or
	// else should render every message card as list of notifications
	if (isDirectMention) {
		return (
			<div>
				{isDirect && (
					<CardLoader<UserContract>
						id={helpers.getActorIdFromCard(props.card)}
						type="user"
						withLinks={['is member of']}
					>
						{(author) => {
							const actor = helpers.generateActorFromUserCard(author);
							if (typeBase === UPDATE) {
								return (
									<Update
										onCardVisible={onCardVisible}
										card={card}
										user={user}
										actor={actor}
									/>
								);
							}
							if (typeBase === LINK) {
								return (
									<LinkedCard
										actor={actor}
										card={card}
										targetCard={targetCard}
									/>
								);
							}
							return <Message {...props} actor={actor} />;
						}}
					</CardLoader>
				)}
			</div>
		);
	} else {
		return (
			<CardLoader<UserContract>
				id={helpers.getActorIdFromCard(props.card)}
				type="user"
				withLinks={['is member of']}
			>
				{(author) => {
					const actor = helpers.generateActorFromUserCard(author);
					if (typeBase === UPDATE) {
						return (
							<Update
								onCardVisible={onCardVisible}
								card={card}
								user={user}
								actor={actor}
							/>
						);
					}
					if (typeBase === LINK) {
						return (
							<LinkedCard actor={actor} card={card} targetCard={targetCard} />
						);
					}
					return <Message {...props} actor={actor} />;
				}}
			</CardLoader>
		);
	}
};

export default compose<any>(withSetup, withCardUpdater(true))(EventWithActor);
