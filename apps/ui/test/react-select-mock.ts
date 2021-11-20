// HACK to get react-select not to complain
// @ts-ignore
global.getComputedStyle = global.window.getComputedStyle = () => {
	return {
		height: '100px',
		getPropertyValue: (name) => {
			return name === 'box-sizing' ? '' : null;
		},
	};
};
