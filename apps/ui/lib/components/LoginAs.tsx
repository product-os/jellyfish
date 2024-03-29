import React from 'react';
import { useDispatch, useStore } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { JellyThunkDispatch, selectors } from '../store';
import { slugify } from '../services/helpers';
import { actionCreators } from '../store';

export const LOGIN_AS_SEARCH_PARAM_NAME = 'loginAs';
export const LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME = 'loginWithProvider';

const LoginAs = () => {
	const store = useStore();
	const dispatch: JellyThunkDispatch = useDispatch();
	const urlRef = React.useRef(new URL(location.href));

	const authenticationTask = useTask(async () => {
		const state = store.getState();
		const currentUser = selectors.getCurrentUser()(state);
		const loginAsUserSlug = `user-${slugify(
			urlRef.current.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME)!,
		)}@1.0.0`;
		const loginWithProviderSlug = `oauth-provider-${urlRef.current.searchParams.get(
			LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
		)!}@1.0.0`;

		if (currentUser && currentUser.slug === loginAsUserSlug.split('@')[0]) {
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

		location.href = await dispatch(
			actionCreators.getIntegrationAuthUrl({
				userSlug: loginAsUserSlug,
				providerSlug: loginWithProviderSlug,
				returnUrl: urlRef.current.href,
			}),
		);
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
