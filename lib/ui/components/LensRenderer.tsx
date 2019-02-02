import * as React from 'react';
import LensService from '../lens';
import { Card, Lens } from '../types';

interface LensRendererProps {
	card: Card;
	level: number;
}

interface LensRendererState {
	lens: Lens;
}

export class LensRenderer extends React.Component<LensRendererProps, LensRendererState> {
	constructor(props: LensRendererProps) {
		super(props);

		this.state = {
			lens: LensService.getLens(props.card),
		};
	}

	componentWillReceiveProps(nextProps: LensRendererProps): void {
		this.setState({
			lens: LensService.getLens(nextProps.card),
		});
	}

	render(): React.ReactNode {
		const ActiveLens = this.state.lens.data.renderer;
		const { card, level } = this.props;
		return (
			<ActiveLens card={card} level={level}  />
		);
	}
}
