import React from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { actionCreators } from '../core';
import { useSetup } from './SetupProvider';
import {
	LOGIN_AS_SEARCH_PARAM_NAME,
	LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
} from './LoginAs';
import { slugify } from '../services/helpers';

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
		const username = returnUrl.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME);

		if (!username) {
			throw new Error(`${LOGIN_AS_SEARCH_PARAM_NAME} parameter missing`);
		}

		const provider = returnUrl.searchParams.get(
			LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
		);

		if (!provider) {
			throw new Error(
				`${LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME} parameter missing`,
			);
		}

		const { access_token: token } = await sdk.post<{ access_token: string }>(
			`/oauth/${provider}`,
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

		history.replace(returnUrl.pathname + returnUrl.search);
	});

	React.useEffect(() => {
		const url = new URL(window.location.href);
		const errorName = url.searchParams.get('error');

		if (errorName) {
			const error = new Error(url.searchParams.get('error_description')!);
			error.name = errorName;

			exchangeCodeTask.setState({
				finished: true,
				error,
			});
		} else {
			exchangeCodeTask.exec();
		}
	}, []);

	return <Task task={exchangeCodeTask}>{() => null}</Task>;
};

export default OauthCallback;
