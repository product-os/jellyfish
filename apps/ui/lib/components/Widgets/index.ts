import { MarkdownWidget } from 'rendition/dist/extra/Renderer/MarkdownWidget';
import { MermaidWidget } from 'rendition/dist/extra/Renderer/MermaidWidget';
import { withOptionProps } from 'rendition/dist/components/Renderer/widgets/widget-util';
import { JellyfishLinkWidget } from './JellyfishLinkWidget';
import { JellyfishUserWidget } from './JellyfishUserWidget';

export { LoopSelectWidget } from './LoopSelectWidget';

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
