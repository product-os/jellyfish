// Core cards
local actionRequest = import 'core/action-request.json';
local action = import 'core/action.json';
local card = import 'core/card.json';
local link = import 'core/link.json';
local session = import 'core/session.json';
local type = import 'core/type.json';
local userAdmin = import 'core/user-admin.json';
local user = import 'core/user.json';
local view = import 'core/view.json';

// Contib cards
local actionCreateCard = import 'contrib/action-create-card.json';
local actionCreateEvent = import 'contrib/action-create-event.json';
local actionCreateSession = import 'contrib/action-create-session.json';
local actionCreateUser = import 'contrib/action-create-user.json';
local actionDeleteCard = import 'contrib/action-delete-card.json';
local actionSetAdd = import 'contrib/action-set-add.json';
local actionUpdateCard = import 'contrib/action-update-card.json';
local actionUpsertCard = import 'contrib/action-upsert-card.json';
local create = import 'contrib/create.json';
local event = import 'contrib/event.json';
local execute = import 'contrib/execute.json';
local externalEvent = import 'contrib/external-event.json';
local issue = import 'contrib/issue.json';
local message = import 'contrib/message.json';
local scratchpadEntry = import 'contrib/scratchpad-entry.json';
local subscription = import 'contrib/subscription.json';
local thread = import 'contrib/thread.json';
local todo = import 'contrib/todo.json';
local triggeredActionHangoutsLink = import 'contrib/triggered-action-hangouts-link.json';
local triggeredAction = import 'contrib/triggered-action.json';
local update = import 'contrib/update.json';
local userGuest = import 'contrib/user-guest.json';
local viewActiveTriggeredActions = import 'contrib/view-active-triggered-actions.json';
local viewActive = import 'contrib/view-active.json';
local viewAllMessages = import 'contrib/view-all-messages.json';
local viewAllUsers = import 'contrib/view-all-users.json';
local viewAllViews = import 'contrib/view-all-views.json';
local viewMyAlerts = import 'contrib/view-my-alerts.json';
local viewMyMentions = import 'contrib/view-my-mentions.json';
local viewMyTodoItems = import 'contrib/view-my-todo-items.json';
local viewNonExecutedActionRequests = import 'contrib/view-non-executed-action-requests.json';
local viewReadUserCommunity = import 'contrib/view-read-user-community.json';
local viewReadUserGuest = import 'contrib/view-read-user-guest.json';
local viewReadUserTeamAdmin = import 'contrib/view-read-user-team-admin.json';
local viewReadUserTeam = import 'contrib/view-read-user-team.json';
local viewScratchpad = import 'contrib/view-scratchpad.json';
local viewWriteUserGuest = import 'contrib/view-write-user-guest.json';

{
  // Core cards
  'core/action-request.json': actionRequest,
  'core/action.json': action,
  'core/card.json': card,
  'core/link.json': link,
  'core/session.json': session,
  'core/type.json': type,
  'core/user-admin.json': userAdmin,
  'core/user.json': user,
  'core/view.json': view,

  // Contrib cards
  'contrib/action-create-card.json': actionCreateCard,
  'contrib/action-create-event.json': actionCreateEvent,
  'contrib/action-create-session.json': actionCreateSession,
  'contrib/action-create-user.json': actionCreateUser,
  'contrib/action-delete-card.json': actionDeleteCard,
  'contrib/action-set-add.json': actionSetAdd,
  'contrib/action-update-card.json': actionUpdateCard,
  'contrib/action-upsert-card.json': actionUpsertCard,
  'contrib/create.json': create,
  'contrib/event.json': event,
  'contrib/execute.json': execute,
  'contrib/external-event.json': externalEvent,
  'contrib/issue.json': issue,
  'contrib/message.json': message,
  'contrib/scratchpad-entry.json': scratchpadEntry,
  'contrib/subscription.json': subscription,
  'contrib/thread.json': thread,
  'contrib/todo.json': todo,
  'contrib/triggered-action-hangouts-link.json': triggeredActionHangoutsLink,
  'contrib/triggered-action.json': triggeredAction,
  'contrib/update.json': update,
  'contrib/user-guest.json': userGuest,
  'contrib/view-active-triggered-actions.json': viewActiveTriggeredActions,
  'contrib/view-active.json': viewActive,
  'contrib/view-all-messages.json': viewAllMessages,
  'contrib/view-all-users.json': viewAllUsers,
  'contrib/view-all-views.json': viewAllViews,
  'contrib/view-my-alerts.json': viewMyAlerts,
  'contrib/view-my-mentions.json': viewMyMentions,
  'contrib/view-my-todo-items.json': viewMyTodoItems,
  'contrib/view-non-executed-action-requests.json': viewNonExecutedActionRequests,
  'contrib/view-read-user-community.json': viewReadUserCommunity,
  'contrib/view-read-user-guest.json': viewReadUserGuest,
  'contrib/view-read-user-team-admin.json': viewReadUserTeamAdmin,
  'contrib/view-read-user-team.json': viewReadUserTeam,
  'contrib/view-scratchpad.json': viewScratchpad,
  'contrib/view-write-user-guest.json': viewWriteUserGuest,
}
