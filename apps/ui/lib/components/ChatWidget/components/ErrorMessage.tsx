import React from 'react';
import { Alert, AlertProps } from 'rendition';

interface Props extends AlertProps {
	children: React.ReactElement[];
}

export const ErrorMessage = ({ children, ...rest }: Props) => {
	return (
		<Alert plaintext danger {...rest}>
			{children}
		</Alert>
	);
};
