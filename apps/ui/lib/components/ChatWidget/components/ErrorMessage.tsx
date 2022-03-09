import React from 'react';
import { Alert } from 'rendition';

export const ErrorMessage = ({ children, ...rest }) => {
	return (
		<Alert plaintext danger {...rest}>
			{children}
		</Alert>
	);
};
