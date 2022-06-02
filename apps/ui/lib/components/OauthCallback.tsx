import React from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { actionCreators } from '../store';
import { useSetup } from './SetupProvider';

const OauthCallback = () => {
	const store = useStore();
	const { sdk, analytics } = useSetup()!;
	const history = useHistory();

	const exchangeCodeTask = useTask(async () => {
		const url = new URL(location.href);
		const code = url.searchParams.get('code');

		if (!code) {
			throw new Error('Auth code is missing');
		}

		const state = url.searchParams.get('state');

		if (!state) {
			throw new Error('State is missing');
		}

		const { returnUrl, userSlug, providerSlug } = JSON.parse(state);

		if (!returnUrl) {
			throw new Error('ReturnUrl is missing');
		}

		if (!userSlug) {
			throw new Error('User slug is missing');
		}

		if (!providerSlug) {
			throw new Error('Provider slug is missing');
		}

		const { access_token: token } = await sdk.post<{ access_token: string }>(
			`/oauth/${providerSlug}`,
			{
				slug: userSlug,
				code,
			},
		);

		if (!token) {
			throw new Error('Could not fetch an auth token');
		}

		await actionCreators.loginWithToken(token)(store.dispatch, store.getState, {
			sdk,
			analytics,
		});

		location.href = returnUrl;
	});

	React.useEffect(() => {
		exchangeCodeTask.exec();
	}, []);

	return <Task task={exchangeCodeTask}>{() => null}</Task>;
};

export default OauthCallback;
