import * as React from 'react';
import { connect } from 'react-redux';
import { Flex, Button } from 'rendition';
import * as _ from 'lodash';
import type { Contract, TypeContract } from 'autumndb';
import * as helpers from '../../../services/helpers';
import { actionCreators, selectors } from '../../../store';
import { bindActionCreators } from '../../../bindactioncreators';
import { BoundActionCreators } from '../../../types';
import { LinkModal } from '../../../components/LinkModal';

interface StateProps {
	activeLoop: string | null;
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

interface OwnProps {
	card: Contract;
	segment: {
		link: string;
		title: string;
		type: string;
	};
	onSave?: (
		card: Contract | null,
		selectedTarget: Contract,
		linkTypeName: string,
	) => any;
}

interface State {
	showLinkModal: boolean;
}

type Props = StateProps & DispatchProps & OwnProps;

class LinkOrCreate extends React.Component<Props, State> {
	state = {
		showLinkModal: false,
	};

	openLinkModal = () => {
		this.setState({
			showLinkModal: true,
		});
	};

	hideLinkModal = () => {
		this.setState({
			showLinkModal: false,
		});
	};

	openCreateChannel = () => {
		const {
			actions: { addChannel },
			card,
			segment,
			types,
			onSave,
			activeLoop,
		} = this.props;

		addChannel({
			head: {
				types: _.find(types, {
					slug: segment.type.split('@')[0],
				}),
				seed: {
					markers: card.markers,
					loop: card.loop || activeLoop,
				},
				onDone: {
					action: 'link',
					targets: [card],
					onLink: onSave
						? (newCard: Contract) => {
								return onSave(null, newCard, segment.link);
						  }
						: null,
				},
			},
			format: 'create',
			canonical: false,
		});
	};

	render() {
		const { card, segment, types, onSave } = this.props;
		const { showLinkModal } = this.state;

		const type = _.find(types, {
			slug: helpers.getRelationshipTargetType(segment),
		});

		return (
			<>
				{segment.link && type && (
					<Flex pb={3} flexWrap="wrap" justifyContent="flex-end">
						<Button
							mr={2}
							mt={2}
							success
							data-test={`add-${type.slug}`}
							onClick={this.openCreateChannel}
						>
							Add {type.name || type.slug}
						</Button>

						<Button
							outline
							mt={2}
							data-test={`link-to-${type.slug}`}
							onClick={this.openLinkModal}
						>
							Link to a {type.name || type.slug}
						</Button>
					</Flex>
				)}

				{showLinkModal && (
					<LinkModal
						linkVerb={segment.link}
						cards={[card]}
						targetTypes={[type]}
						onHide={this.hideLinkModal}
						onSave={onSave}
						onSaved={_.noop}
					/>
				)}
			</>
		);
	}
}

const mapStateToProps = (state: any): StateProps => {
	return {
		activeLoop: selectors.getActiveLoop()(state),
		types: selectors.getTypes()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(LinkOrCreate);
