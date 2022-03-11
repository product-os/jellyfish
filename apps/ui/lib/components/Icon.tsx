import omit from 'lodash/omit';
import classnames from 'classnames';
import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLElement> {
	name: string;
	brands?: boolean;
	regular?: boolean;
	spin?: boolean;
	rotate?: number | string;
}

const Icon: React.FunctionComponent<IconProps> = (props) => {
	const restProps = omit(props, [
		'brands',
		'regular',
		'name',
		'spin',
		'rotate',
	]);

	// TODO: Replace the boolean props (brands, regular) with
	// a single enum prop so it's impossible to inadvertently
	// set two of them
	const className = classnames(`fa-${props.name}`, {
		fas: !props.brands && !props.regular,
		far: !props.brands && props.regular,
		fab: props.brands,
		'fa-spin': props.spin,
		[`fa-rotate-${props.rotate}`]: props.rotate,
	});
	return <i {...restProps} className={className} />;
};

export default Icon;
