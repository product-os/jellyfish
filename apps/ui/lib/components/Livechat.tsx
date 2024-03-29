import React from 'react';
import useEventListener from '@use-it/event-listener';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { ChatWidget } from './ChatWidget';
declare const window: Window & { sdk: JellyfishSDK };

const Livechat = () => {
	const queryParams = React.useMemo(() => {
		const { state, ...rest } = Object.fromEntries(
			new URLSearchParams(location.search).entries(),
		);

		if (state) {
			return JSON.parse(state);
		}

		return rest;
	}, [location.search]);

	const { product, productTitle, inbox } = queryParams;

	const onClose = React.useCallback(() => {
		window.parent.postMessage(
			{
				type: 'close',
			},
			'*',
		);
	}, []);

	const onNotificationsChange = React.useCallback((notifications) => {
		window.parent.postMessage(
			{
				type: 'notifications-change',
				payload: {
					data: notifications,
				},
			},
			'*',
		);
	}, []);

	const [initialUrl, setInitialUrl] = React.useState();

	const handleMessage = React.useCallback(
		(event) => {
			if (!event.data) {
				return;
			}

			switch (event.data.type) {
				case 'navigate':
					setInitialUrl(event.data.payload);
					break;
				default:
					break;
			}
		},
		[setInitialUrl],
	);

	useEventListener('message', handleMessage, window);

	return (
		<ChatWidget
			product={product}
			productTitle={productTitle}
			inbox={inbox}
			initialUrl={initialUrl}
			onClose={onClose}
			onNotificationsChange={onNotificationsChange}
		/>
	);
};

/*
 * Init livechat.
 */
console.log('Initializing livechat:', location.href);

export default Livechat;
