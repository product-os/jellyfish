import React from 'react';
import { Flex, useTheme } from 'rendition';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import * as helpers from '../../../services/helpers';
import { useSetup } from '../../SetupProvider';
import { Task } from './Task';
import {
	useActions,
	useCombineTasks,
	useTask,
	useNotificationWatcher,
} from '../hooks';
import { INITIAL_FETCH_CONVERSATIONS_LIMIT } from '../constants';
import { Header } from './Header';
import {
	selectCardById,
	selectThreadListQuery,
	selectThreads,
} from '../store/selectors';
import { SET_CARDS } from '../store/action-types';

const ChatWrapper = styled(Flex)`
	p {
		margin-top: 0;
		margin-bottom: ${(props) => {
			return helpers.px(props.theme.space[2]);
		}};
	}
	p:last-child {
		margin-bottom: 0;
	}
`;

export const Layout = ({
	initialUrl,
	onClose,
	onNotificationsChange,
	children,
	...rest
}) => {
	const theme = useTheme();
	const actions = useActions();
	const store = useStore();
	const { sdk } = useSetup()!;
	const fetchThreads = useTask(actions.fetchThreads);
	const setCurrentUser = useTask(actions.setCurrentUser);
	const setGroups = useTask(actions.setGroups);
	const history = useHistory();

	useNotificationWatcher({
		onNotificationsChange,
	});

	const combinedTask = useCombineTasks(fetchThreads, setCurrentUser);

	React.useEffect(() => {
		setGroups.exec();
		setCurrentUser.exec();

		fetchThreads.exec({
			limit: INITIAL_FETCH_CONVERSATIONS_LIMIT,
		});

		const threadListQuery = selectThreadListQuery()(store.getState());
		const threadListStream = sdk.stream(threadListQuery);

		threadListStream.on('update', ({ data, error }) => {
			if (error) {
				console.error(error);
				return;
			}

			/*
			 * Apply changes only if:
			 * 1. Thread already exists in cache;
			 * 2. Thread that did not exist has the highest timestamp;
			 */
			if (data.type === 'insert' || data.type === 'update') {
				const currentState = store.getState();

				if (selectCardById(data.after.id)(currentState)) {
					return store.dispatch({
						type: SET_CARDS,
						payload: [data.after],
					});
				}

				const nextState = {
					...currentState,
					cards: {
						[data.after.id]: data.after,
					},
				};

				const sortedThreads = selectThreads()(nextState);

				if (sortedThreads[0]?.id === data.after.id) {
					store.dispatch({
						type: SET_CARDS,
						payload: [data.after],
					});
				}
			}
		});

		return () => {
			threadListStream.close();
		};
	}, []);

	React.useEffect(() => {
		if (initialUrl) {
			history.push(initialUrl);
		}
	}, [initialUrl]);

	return (
		<ChatWrapper
			{...rest}
			flexDirection="column"
			color={theme.colors.secondary.main}
			backgroundColor={theme.colors.quartenary.light}
			style={{
				overflow: 'hidden',
			}}
		>
			<Header onClose={onClose} />
			<Flex
				flex={1}
				flexDirection="column"
				style={{
					overflow: 'hidden',
				}}
			>
				<Task task={combinedTask}>
					{() => {
						return children;
					}}
				</Task>
			</Flex>
		</ChatWrapper>
	);
};
