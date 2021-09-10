import type { Format } from "rendition/dist/components/Renderer/types";
import { NameWidget } from "./NameWidget";
import { UUIDWidget } from "./UUIDWidget";
import { TimestampWidget } from "./TimestampWidget";
import { TagsWidget } from "./TagsWidget";
import { LinkWidget } from "./LinkWidget";
import { AccountWidget } from "./AccountWidget";
import { DueDateWidget } from "./DueDateWidget";
import { BadgeWidget } from "./BadgeWidget";

export const formats = [
	{
		name: "name",
		format: ".*",
		widget: NameWidget,
	},

	{
		name: "uuid",
		format: ".*",
		widget: UUIDWidget,
	},

	{
		name: "created at",
		format: ".*",
		widget: TimestampWidget,
	},

	{
		name: "updated at",
		format: ".*",
		widget: TimestampWidget,
	},

	{
		name: "tags",
		format: ".*",
		widget: TagsWidget,
	},

	{
		name: "uri",
		format: ".*",
		widget: LinkWidget,
	},

	{ name: "account", format: ".*", widget: AccountWidget },

	{ name: "due-date", format: ".*", widget: DueDateWidget },

	{ name: "badge", format: ".*", widget: BadgeWidget },
] as Format[];
