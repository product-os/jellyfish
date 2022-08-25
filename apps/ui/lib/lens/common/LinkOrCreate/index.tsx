import * as React from 'react';
import { connect } from 'react-redux';
import { Flex, Button } from 'rendition';
import * as _ from 'lodash';
import styled from 'styled-components';
import type { Contract, ContractSummary, TypeContract } from 'autumndb';
import * as helpers from '../../../services/helpers';
import { actionCreators, selectors } from '../../../store';
import { bindActionCreators } from '../../../bindactioncreators';
import { BoundActionCreators } from '../../../types';
import { LinkModal } from '../../../components/LinkModal';
import { Icon } from '../../../components';

const Footer = styled(Flex)`
	position: absolute;
	bottom: 16px;
	right: 16px;
	z-index: 9;
`;

interface StateProps {
	activeLoop: string | null;
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

interface OwnProps {
	fixed?: boolean;
	card: Contract;
	segment: {
		link: string;
		title: string;
		type: string;
	};
	onSave?: (
		fromCard: ContractSummary | null,
		toCard: ContractSummary,
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
				types: _.filter(types, {
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
		const { card, segment, types, onSave, fixed } = this.props;
		const { showLinkModal } = this.state;

		const type = _.find(types, {
			slug: helpers.getRelationshipTargetType(segment),
		});

		const style: any = fixed
			? { position: 'relative', right: 0, marginRight: 0 }
			: {};

		return (
			<>
				{segment.link && type && (
					<Footer
						style={style}
						mr={1}
						flexWrap="wrap"
						justifyContent="flex-end"
					>
						<Button
							mr={2}
							mt={2}
							width={38}
							success
							data-test={`add-${type.slug}`}
							onClick={this.openCreateChannel}
							tooltip={{
								text: `Add ${type.name || type.slug}`,
								placement: 'left',
							}}
							icon={<Icon name="plus" />}
						/>

						<Button
							width={38}
							mt={2}
							data-test={`link-to-${type.slug}`}
							onClick={this.openLinkModal}
							tooltip={{
								text: `Link to a ${type.name || type.slug}`,
								placement: 'left',
							}}
							icon={<Icon name="bezier-curve" />}
						/>
					</Footer>
				)}

				{showLinkModal && (
					<LinkModal
						linkVerb={segment.link}
						cards={[card]}
						targetTypes={type ? [type] : []}
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
