import * as React from 'react';

export const withDefaultProps = (defaultProps: any = {}) => {
	return (Component: any) => {
		return (props: any) => {
			return <Component {...defaultProps} {...props} />;
		};
	};
};
