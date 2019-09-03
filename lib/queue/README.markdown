The Jellyfish system processes incoming action requests and adds them to a
queue. The system can dequeue the next action request, execute it, and post the
results back. This module provides a small set of functions to perform any
action request queue-related operations.

No module that interacts with the action request queue should try to bypass
this module.

### Goals

- The queue aims to be fast
- The queue aims to be a layer on top of the core to effectively manage action
	requests
- The queue aims to be the source of truth of how action requests are marked as
	executed and how action requests results are propagated back
