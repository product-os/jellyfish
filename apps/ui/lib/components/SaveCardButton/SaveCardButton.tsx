import React, { useState } from 'react';
import { Button } from 'rendition';
import { notifications, Icon } from '@balena/jellyfish-ui-components';

export const SaveCardButton: React.FunctionComponent<any> = React.memo(
	({ sdk, onUpdateCard, patch, card, buttonText, onDone, ...rest }) => {
		const [submitting, setSubmitting] = useState(false);

		const updateCard = async () => {
			setSubmitting(true);
			try {
				const cardPatch = typeof patch === 'function' ? patch(card) : patch;
				const { id } = await onUpdateCard(card, cardPatch);
				const updatedCard = await sdk.card.get(id);
				onDone(updatedCard);
			} catch (error) {
				notifications.addNotification('danger', 'Failed to save card');
				console.error('Failed to save card', error);
			} finally {
				setSubmitting(false);
			}
		};

		return (
			<Button
				onClick={updateCard}
				tooltip={`Save changes to '${card.name || card.slug}'`}
				{...rest}
			>
				{submitting ? <Icon spin name="cog" /> : buttonText || 'Save'}
			</Button>
		);
	},
);
