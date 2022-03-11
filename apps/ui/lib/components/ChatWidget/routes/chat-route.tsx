import get from 'lodash/get';
import noop from 'lodash/noop';
import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from 'rendition';
import { Timeline, useSetup } from '../../';
import { useActions, useRouter, useTask } from '../hooks';
import {
	selectCurrentUser,
	selectMessages,
	selectCardById,
	selectGroups,
	selectNotificationsByThread,
} from '../store/selectors';
import { FETCH_MORE_MESSAGES_LIMIT } from '../constants';
import { Task } from '../components/Task';

export const ChatRoute = () => {
	// Using an empty types array will effectively disable the autocomplete
	// trigger that uses the types
	const types = [];
	const { environment } = useSetup()!;
	const router = useRouter();
	const actions = useActions();
	const currentUser = useSelector(selectCurrentUser())!;
	const groups = useSelector(selectGroups());
	const loadThreadDataTask = useTask(actions.loadThreadData);
	// TS-TODO: `thread` does not exist in the type and does not seem to exist
	// in the code either. Casting to `any` here until this can be investigated
	const threadId = (router.match.params as any).thread;
	const messages = useSelector(selectMessages(threadId));
	const thread = useSelector(selectCardById(threadId));
	const notifications = useSelector(selectNotificationsByThread(threadId));

	React.useEffect(() => {
		loadThreadDataTask.exec(threadId, FETCH_MORE_MESSAGES_LIMIT);
	}, []);

	// ToDo: implement this
	const usersTyping = React.useMemo(() => {
		return {};
	}, []);

	const timelineHeaderOptions = React.useMemo(() => {
		return {
			title: get(thread, ['name']),
			buttons: {
				toggleWhispers: false,
				toggleEvents: false,
			},
		};
	}, [thread]);

	return (
		<Task task={loadThreadDataTask}>
			{() => {
				if (!thread) {
					return null;
				}

				return (
					<Box
						flex={1}
						style={{
							position: 'relative',
						}}
						data-test="chat-page"
						data-test-id={thread.id}
					>
						<Box
							style={{
								position: 'absolute',
								width: '100%',
								height: '100%',
							}}
						>
							<Timeline
								enableAutocomplete={!environment.isTest()}
								types={types}
								groups={groups}
								wide={false}
								allowWhispers={false}
								card={thread}
								tail={messages}
								usersTyping={usersTyping}
								user={currentUser}
								getActor={actions.getActor}
								signalTyping={noop}
								setTimelineMessage={noop}
								eventMenuOptions={false}
								headerOptions={timelineHeaderOptions}
								next={() => actions.loadMoreThreadData(thread.id)}
								notifications={notifications}
							/>
						</Box>
					</Box>
				);
			}}
		</Task>
	);
};
