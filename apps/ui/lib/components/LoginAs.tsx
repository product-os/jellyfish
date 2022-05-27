import React from 'react';
import { useStore } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { actionCreators, selectors } from '../core';
import { slugify } from '../services/helpers';
import { useSetup } from './SetupProvider';

export const LOGIN_AS_SEARCH_PARAM_NAME = 'loginAs';
export const LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME = 'loginWithProvider';

const LoginAs = () => {
	const store = useStore();
	const { sdk, analytics, errorReporter } = useSetup()!;
	const urlRef = React.useRef(new URL(location.href));

	const authenticationTask = useTask(async () => {
		const state = store.getState();
		const user = selectors.getCurrentUser(state);
		const loginAs = urlRef.current.searchParams.get(
			LOGIN_AS_SEARCH_PARAM_NAME,
		)!;

		if (user && user.slug === `user-${slugify(loginAs)}`) {
			urlRef.current.searchParams.delete(LOGIN_AS_SEARCH_PARAM_NAME);
			urlRef.current.searchParams.delete(LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME);
			return;
		}

		const loginWithProvider = urlRef.current.searchParams.get(
			LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
		)!;

		if (!loginWithProvider) {
			throw new Error(
				`Missing ${LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME} parameter!`,
			);
		}

		const result = await sdk.get<{ url: string }>(
			`/oauth/url/${loginWithProvider}`,
		);

		// If logged in user and user passed in loginAs do not match, log out
		actionCreators.logout()(store.dispatch, store.getState, {
			sdk,
			analytics,
			errorReporter,
		});

		const authorizeUrl = new URL(result.url);
		authorizeUrl.searchParams.append('state', urlRef.current.href);
		location.href = authorizeUrl.href;
	});

	React.useEffect(() => {
		authenticationTask.exec();
	}, []);

	return (
		<Task task={authenticationTask}>
			{() => {
				return (
					<Redirect to={urlRef.current.pathname + urlRef.current.search} />
				);
			}}
		</Task>
	);
};

export default LoginAs;
