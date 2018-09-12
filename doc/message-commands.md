# Running commands from messages

Users would like to be able to trigger functions (commands) from the content of messages. This pattern takes three forms.
The first type is using the CLI directly from a message:

| /action create todo "debug notifications" |
| -- |

The second type is where a command is triggered by a "symbol" from within the content of a message, essentially behaving as a shorthand for a CLI command:

| debug notifications `$todo` |
| -- |

The third type is where you interact with a service bot (hubot-like
functionality) that will provide
various utility functions, such as setting reminders or creating a meeting room:

| `@zissou` remind me tomorrow to debug notificiations
| -- |

For the purposes of discussion I'll refer to the first type as "direct commands" and the second type as "interpreted commands".

## Direct commands

Direct commands use the same pattern as the CLI and take the form:
```
/<namespace> <method> [argument]...
```

In the example:

| /action create todo "debug notifications" |
| -- |

- the `namespace` is "action"
- the `method` is "create"
- the arguments are "todo" and "debug notifications"

A direct command must always beign with a forward slash (`/`).

## Interpreted commands

Interpreted commands use a symbol to trigger a command, where the rest of the message (excepting the symbol) is passed as the first argument to the command.
The character indicating that the symbol is an interpreted command is always
`$`.

In the example:

| debug notifications `$todo` |
| --  |

- The `$` command indicates that an interpreted command is being used
- The command is extracted by matching all characters from the `$` sign until the next whitespace or line ending
- `todo` is a shorthand for creating a card of type "todo"
- The content of the message with the symbol removed is used as the content of the "todo" card

### Passing additional parameters

Additional arguments can be passed in the interpreted command using two hyphens (`--`). For example set a deadline for a todo item by providing it as a second argument:

| debug notifications `$todo--tomorrow` |
| --  |

## Service bot commands

A service bot command is always prefixed by the name of the service bot, with
the rest of the message being parsed for command parameters. Each of these
commands can be defined as separate triggered actions.

The service bot can have its own user, automatically created at startup at the
same time as the action, guest and admin users.
