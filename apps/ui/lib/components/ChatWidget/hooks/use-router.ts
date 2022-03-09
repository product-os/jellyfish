import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';

export const useRouter = () => {
	return {
		location: useLocation(),
		history: useHistory(),
		match: useRouteMatch(),
	};
};
