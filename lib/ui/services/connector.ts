import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, StoreState } from '../core/store';

interface StateFromProps {
	appState: StoreState;
}

interface DispatchFromProps {
	actions: typeof actionCreators;
}

export interface ConnectedComponentProps extends StateFromProps, DispatchFromProps {}

const mapStateToProps = (state: StoreState): StateFromProps => ({
	appState: state,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const connectComponent = <P extends ConnectedComponentProps>(component: React.ComponentType<P>) => {
	return connect(mapStateToProps, mapDispatchToProps)<P>(component);
};

