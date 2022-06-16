import * as React from 'react';
import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { slugify } from '../services/helpers';
import { actionCreators, State } from '../store';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';

export const LOGIN_AS_SEARCH_PARAM_NAME = 'loginAs';
export const LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME = 'loginWithProvider';

export const AuthorizeTask = (props) => {
	const dispatch: ThunkDispatch<State, any, AnyAction> = useDispatch();

	const task = useTask(async () => {
		const url = new URL(location.href);
		const loginAs = url.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME);
		const loginWithProvider = url.searchParams.get(
			LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
		);

		const redirectUrl = await dispatch(
			actionCreators.authorize({
				loginAs: loginAs ? `user-${slugify(loginAs)}@1.0.0` : null,
				loginWithProvider: loginWithProvider
					? `oauth-provider-${slugify(loginWithProvider)}@1.0.0`
					: null,
				returnUrl: url.href,
			}),
		);

		if (redirectUrl) {
			location.href = redirectUrl;
		}
	});

	React.useEffect(() => {
		task.exec();
	}, []);

	return <Task task={task} {...props} />;
};
