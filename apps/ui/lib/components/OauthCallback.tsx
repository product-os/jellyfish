import React from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Task } from '@balena/jellyfish-chat-widget/build/components/task';
import { useTask } from '@balena/jellyfish-chat-widget/build/hooks';
import { actionCreators } from '../core';
import { useSetup } from '@balena/jellyfish-ui-components';
import { LOGIN_AS_SEARCH_PARAM_NAME } from './LoginAs';
import { slugify } from '@balena/jellyfish-ui-components/build/services/helpers';

const OauthCallback = () => {
	const store = useStore();
	const { sdk, analytics } = useSetup()!;
	const history = useHistory();

	const exchangeCodeTask = useTask(async () => {
		const url = new URL(location.href);
		const code = url.searchParams.get('code');

		if (!code) {
			throw new Error('Auth code missing');
		}

		const state = url.searchParams.get('state');

		if (!state) {
			throw new Error('state (returnUrl) missing');
		}

		let returnUrl: URL;
		let username: string | null;

		/*
		 * If the state is in JSON format, it means that oauth flow started by livechat.ly.fish,
		 * done for backwards compatibility. TODO: Remove try block after fully merging
		 * UI and Livechat.
		 */
		try {
			const jsonState = JSON.parse(state);

			if (typeof jsonState === 'string') {
				throw new Error('JSON format is invalid');
			}

			username = jsonState.username;
			returnUrl = new URL(`${location.protocol}//${location.host}/livechat`);
			returnUrl.searchParams.set('product', jsonState.product);
			returnUrl.searchParams.set('productTitle', jsonState.productTitle);
			returnUrl.searchParams.set('inbox', jsonState.inbox);
		} catch (err) {
			returnUrl = new URL(state);
			username = returnUrl.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME);
		}

		if (!username) {
			throw new Error(`${LOGIN_AS_SEARCH_PARAM_NAME} parameter missing`);
		}

		const { access_token: token } = await sdk.post<{ access_token: string }>(
			'/oauth/balena-api',
			{
				slug: `user-${slugify(username)}`,
				code,
			},
		);

		if (!token) {
			throw new Error('Could not fetch auth token');
		}

		await actionCreators.loginWithToken(token)(store.dispatch, store.getState, {
			sdk,
			analytics,
		});

		returnUrl.searchParams.delete(LOGIN_AS_SEARCH_PARAM_NAME);
		history.replace(returnUrl.pathname + returnUrl.search);
	});

	React.useEffect(() => {
		exchangeCodeTask.exec();
	}, []);

	return <Task task={exchangeCodeTask}>{() => null}</Task>;
};

export default OauthCallback;
