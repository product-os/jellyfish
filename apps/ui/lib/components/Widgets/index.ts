import { withOptionProps } from 'rendition/dist/components/Renderer/widgets/widget-util';
import { JellyfishLinkWidget } from './JellyfishLinkWidget';
import { JellyfishUserWidget } from './JellyfishUserWidget';
import { createLazyComponent } from '../SafeLazy';
export { LoopSelectWidget } from './LoopSelectWidget';
import MarkdownWidget from './MarkdownWidget';
import MermaidWidget from './MarkdownWidget';

export const JellyfishWidgets = [
	{
		name: 'markdown',
		format: '.*',
		widget: MarkdownWidget,
	},
	{
		name: 'mermaid',
		format: '.*',
		widget: MermaidWidget,
	},
	...[JellyfishLinkWidget, JellyfishUserWidget].map((widget: any) => ({
		name: widget.displayName,
		format: '.*',
		widget: widget.uiOptions
			? withOptionProps(widget.uiOptions)(widget)
			: widget,
	})),
];
