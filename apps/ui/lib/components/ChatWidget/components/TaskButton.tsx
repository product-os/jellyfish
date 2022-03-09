import React from 'react';
import { Button } from 'rendition';
import { ErrorMessage } from './ErrorMessage';
import { Loader } from './Loader';

export const TaskButton: React.FunctionComponent<any> = ({
	task,
	children,
	onClick,
	onSuccess,
	onFailure,
	...rest
}) => {
	const icon = task.started ? <Loader color="white" /> : null;

	const handleClick = React.useCallback(
		async (event) => {
			if (onClick) {
				onClick(event);
				return;
			}

			try {
				const { result } = await task.exec();

				if (onSuccess) {
					onSuccess(result);
				}
			} catch (err) {
				if (onFailure) {
					onFailure(err);
				}
			}
		},
		[task, onClick],
	);

	return (
		<React.Fragment>
			{task.error && <ErrorMessage mb={4}>{task.error.message}</ErrorMessage>}
			<Button
				disabled={task.started}
				icon={icon}
				onClick={handleClick}
				{...rest}
			>
				{children}
			</Button>
		</React.Fragment>
	);
};
