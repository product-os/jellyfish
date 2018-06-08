import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { JellyfishState } from '../../Types';
import { actionCreators } from '../app';

interface StateFromProps {
	appState: JellyfishState;
}

interface DispatchFromProps {
	actions: typeof actionCreators;
}

export interface ConnectedComponentProps extends StateFromProps, DispatchFromProps {}

const mapStateToProps = (state: JellyfishState): StateFromProps => ({
	appState: state,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const connectComponent = <P extends ConnectedComponentProps>(component: React.ComponentType<P>) => {
	return connect(mapStateToProps, mapDispatchToProps)<P>(component);
};

