import { withOptionProps } from 'rendition/dist/components/Renderer/widgets/widget-util';
import { JellyfishLinkWidget } from './JellyfishLinkWidget';
import { JellyfishUserWidget } from './JellyfishUserWidget';
import { createLazyComponent } from '../SafeLazy';
export { LoopSelectWidget } from './LoopSelectWidget';

export const MarkdownWidget = createLazyComponent(
	() => import(/* webpackChunkName: "markdown-widget" */ './MarkdownWidget'),
);

export const MermaidWidget = createLazyComponent(
	() => import(/* webpackChunkName: "mermaid-widget" */ './MermaidWidget'),
);

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
