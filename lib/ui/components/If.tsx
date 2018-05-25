import * as React from 'react';

interface IfProps {
	condition: boolean;
	children: any;
}

export const If = ({ condition, children }: IfProps) => {
	if (condition) {
		return (
			<React.Fragment>
				{children}
			</React.Fragment>
		);
	}

	return null;
};
