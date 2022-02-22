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

		const returnUrl = new URL(state);
		const username =
			returnUrl.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME) ||
			returnUrl.searchParams.get('username'); // TODO: Remove this when ui and livechat are merged

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
