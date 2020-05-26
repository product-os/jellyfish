# Jellyfish UI

The primary web browser client for Jellyfish

## Goals

Listed below are the guiding principles for building UI in Jellyfish. Whilst we
are not meeting all of these goals now, we should aim to do so.

- The UI should be built out of generic, reusable parts
- Interfaces should be automatically generated based on data returned from the
	API
- The UI should be usable on touchscreen devices with small viewports
- The UI should be compatible with Chrome, Safari, Firefox and Edge browsers
- All API interaction should be done using the SDK
- Functionality should progressiveley enhance, enabling features if possible
- The use of the UI should be observable and measurable
- The performance of the UI should be observable and measurable
- The UI should be WAI-ARIA compliant https://www.w3.org/WAI/standards-guidelines/aria/
- The UI should not rely on control flows that evaluate unique identifiers other
	than the `type` field. (i.e. no hardcoding)
- The UI should not contain logic that should be refactored into the API
- The UI should not compensate for limitations of the API
- The UI should not compensate for limitations of the data model

