import React from 'react';
import { useStore } from 'react-redux';
import { useSetup } from '../components/SetupProvider';
import { actionCreators, selectors } from '../store';
import { slugify } from '../services/helpers';

export const LOGIN_AS_SEARCH_PARAM_NAME = 'loginAs';
export const LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME = 'loginWithProvider';

export const useAuthorize = () => {
	const store = useStore();
	const { sdk } = useSetup()!;

	React.useEffect(() => {
		(async () => {
			const url = new URL(location.href);
			if (url.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME)) {
				const state = store.getState();
				const currentUser = selectors.getCurrentUser()(state);
				const loginAsUserSlug = `user-${slugify(
					url.searchParams.get(LOGIN_AS_SEARCH_PARAM_NAME)!,
				)}@1.0.0`;
				const loginWithProviderSlug = `oauth-provider-${url.searchParams.get(
					LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
				)!}@1.0.0`;

				if (currentUser && currentUser.slug === loginAsUserSlug.split('@')[0]) {
					url.searchParams.delete(LOGIN_AS_SEARCH_PARAM_NAME);
					url.searchParams.delete(LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME);
					return;
				}

				const loginWithProvider = url.searchParams.get(
					LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME,
				)!;

				if (!loginWithProvider) {
					throw new Error(
						`Missing ${LOGIN_WITH_PROVIDER_SEARCH_PARAM_NAME} parameter!`,
					);
				}

				location.href = await actionCreators.getIntegrationAuthUrl({
					userSlug: loginAsUserSlug,
					providerSlug: loginWithProviderSlug,
					returnUrl: url.href,
				})(store.dispatch, store.getState, {
					sdk,
				});
			}
		})();
	}, []);
}