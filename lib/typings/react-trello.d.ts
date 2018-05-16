declare module 'react-trello' {
	import { Component } from 'react';

	export interface BoardCard {
		id: string;
		title: string;
		description?: string;
		label?: string;
		metadata?: any;
	}

	export interface BoardLane {
		id: string;
		title?: string;
		label?: string;
		cards: BoardCard[];
	}

	export interface BoardData {
		lanes: BoardLane[];
	}

	interface BoardProps {
		style?: React.CSSProperties;
		data: BoardData;
		draggable?: boolean;
		customLaneHeader?: JSX.Element;
		handleDragEnd?: (cardId: string, sourceLaneId: string, targetLaneId: string, position: number) => void;
		handleLaneDragEnd?: (laneId: string, newPosition: number) => void;
		onCardClick?: (cardId: string, metadata: any, laneId: string) => void;
		onDataChange?: (data: BoardData) => void;
	}

	class Board extends Component<BoardProps, any> {}

	export default Board;
}
