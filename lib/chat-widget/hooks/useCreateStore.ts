import * as React from 'react';
import * as io from 'socket.io-client';
import { ActionType } from '../state/ActionType';
import {
	Action,
	EventData,
	initialState,
	reducer,
	State,
} from '../state/reducer';

export interface Store {
	state: State;
	dispatch: React.Dispatch<Action>;
	config: StoreConfig;
}

export const StoreContext = React.createContext<Pick<Store, 'state'>>({
	state: initialState,
});

interface StoreConfig {
	token: string;
	apiUrl: string;
}

export const useCreateStore = ({ token, apiUrl }: StoreConfig): Store => {
	const [state, dispatch] = React.useReducer(reducer, initialState);

	const config = React.useMemo(
		() => ({
			token,
			apiUrl,
		}),
		[token, apiUrl],
	);

	React.useEffect(() => {
		const socketChannel = io(`wss://${apiUrl}`, {
			transports: ['websocket'],
			query: {
				token,
			},
		});

		socketChannel.on('message_received', (payload: EventData) => {
			dispatch({
				type: ActionType.MESSAGE_RECEIVED,
				payload,
			});
		});

		socketChannel.on('message_sent', (payload: EventData) => {
			dispatch({
				type: ActionType.MESSAGE_SENT,
				payload,
			});
		});

		return () => {
			socketChannel.close();
		};
	}, [token, apiUrl]);

	return React.useMemo(
		() => ({
			state,
			dispatch,
			config,
		}),
		[state, dispatch, config],
	);
};
