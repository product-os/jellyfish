// This is an implementation of the bindActionCreators function from
// Redux that will work correctly with Thunk actions and typescript.
// The standard function mangles the return type of the function.
// TODO: Figure out how to handle this with the standard library.
import * as _ from 'lodash';

export const bindActionCreators = <T extends {}>(
	actionCreators: T,
	dispatch: any,
) => {
	return _.mapValues(actionCreators, (actionCreator: any) => {
		return (...args: Parameters<typeof actionCreator>) =>
			dispatch(actionCreator(...args));
	});
};
