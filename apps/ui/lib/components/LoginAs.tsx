import React from 'react';
import { useStore } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { selectors } from '../store';
import { slugify } from '../services/helpers';

export const LOGIN_AS_SEARCH_PARAM_NAME = 'loginAs';

const LoginAs = () => {
	const store = useStore();
	const urlRef = React.useRef(new URL(location.href));

	const authenticationTask = useTask(async () => {
		const state = store.getState();
		const user = selectors.getCurrentUser()(state);
		const loginAs = urlRef.current.searchParams.get(
			LOGIN_AS_SEARCH_PARAM_NAME,
		)!;

		if (user && user.slug === `user-${slugify(loginAs)}`) {
			urlRef.current.searchParams.delete(LOGIN_AS_SEARCH_PARAM_NAME);
			return;
		}

		const oauthUrl = `https://dashboard.balena-cloud.com/login/oauth/jellyfish?state=${encodeURIComponent(
			urlRef.current.href,
		)}`;
		location.href = oauthUrl;
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
