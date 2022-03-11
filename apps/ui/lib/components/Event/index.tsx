import React from 'react';
import { compose } from 'redux';
import type { UserContract } from '@balena/jellyfish-types/build/core';
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
	const { card, user, onCardVisible, targetCard } = props;
	const typeBase = props.card.type.split('@')[0];
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
};

export default compose<any>(withSetup, withCardUpdater(true))(EventWithActor);
