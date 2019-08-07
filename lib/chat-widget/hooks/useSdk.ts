import { useMemo } from 'react';
import { getSdk } from '../../sdk';
import { useStore } from './useStore';

export const useSdk = () => {
	const {
		config: { apiUrl, token },
	} = useStore();

	return useMemo(
		() => getSdk({
			authToken: token,
			apiUrl,
			apiPrefix: 'api/v2',
		}),
		[token, apiUrl]
	);
};
