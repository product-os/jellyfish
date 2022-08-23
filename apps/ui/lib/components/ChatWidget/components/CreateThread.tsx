import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Flex, Input } from 'rendition';
import styled from 'styled-components';
import { MessageInput, useSetup } from '../../';
import { TaskButton } from './TaskButton';
import { useActions, useTask } from '../hooks';
import { selectCurrentUser } from '../store/selectors';

const StyledMessageInput = styled(MessageInput)`
	border: 1px solid #dde1f0;
	border-radius: ${(props) => {
		return props.theme.radius;
	}}px;

	&:focus-within {
		border-color: ${(props) => {
			return props.theme.colors.tertiary.main;
		}};
	}
`;

export const CreateThread: React.FunctionComponent<any> = ({
	renderTaskChildren,
	onSuccess,
	...rest
}) => {
	// Using an empty types array will effectively disable the autocomplete
	// trigger that uses the types
	const types: any[] = [];
	const { sdk, environment } = useSetup()!;
	const currentUser = useSelector(selectCurrentUser())!;
	const [subject, setSubject] = React.useState('');
	const [text, setText] = React.useState('');
	const [files, setFiles] = React.useState<any>([]);
	const actions = useActions();
	const initiateThreadTask = useTask(actions.initiateThread);

	const handleSubjectChage = React.useCallback((event) => {
		setSubject(event.target.value);
	}, []);

	const handleTextChange = React.useCallback((event) => {
		setText(event.target.value);
	}, []);

	const handleFileChange = React.useCallback((value) => {
		setFiles([...value]);
	}, []);

	const handleSubmit = React.useCallback(async () => {
		const taskState = await initiateThreadTask.exec({
			subject,
			text,
			files,
		});

		if (taskState.finished && !taskState.error) {
			onSuccess(taskState.result);
		}
	}, [subject, text, files]);

	return (
		<Box {...rest}>
			<Box flex="1">
				<Input
					bg="white"
					placeholder="Subject"
					value={subject}
					onChange={handleSubjectChage}
					data-test="conversation-subject"
				/>
			</Box>
			<Box mt={1}>
				{/* @ts-ignore */}
				<StyledMessageInput
					enableAutocomplete={!environment.isTest()}
					sdk={sdk}
					types={types}
					wide={false}
					user={currentUser}
					value={text}
					placeholder="Type your message"
					onChange={handleTextChange}
					files={files}
					onFileChange={handleFileChange}
				/>
			</Box>
			<Flex p={16} flexDirection="column" alignItems="center">
				<TaskButton
					task={initiateThreadTask}
					primary
					onClick={handleSubmit}
					data-test="start-conversation-button"
				>
					Start conversation
				</TaskButton>
			</Flex>
		</Box>
	);
};
