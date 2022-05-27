import React from 'react';
import { Link, Flex } from 'rendition';
import { ErrorMessage } from './ErrorMessage';
import { Loader } from './Loader';

export const Task: React.FC<any> = ({ task, children, ...rest }) => {
	if (!task.finished || task.error) {
		return (
			<Flex justifyContent="center" mt={3} mx={3} {...rest}>
				{task.finished ? (
					<ErrorMessage>
						{task.error.message}
						<Link ml={1} onClick={task.retry}>
							Retry
						</Link>
					</ErrorMessage>
				) : (
					<Loader />
				)}
			</Flex>
		);
	}

	return children ? children(task.result) : null;
};
