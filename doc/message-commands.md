# Running commands from messages

Users would like to be able to trigger functions (commands) from the content of messages. This pattern takes two forms.
The first type is when a message *is* a command, for example:

| /action create todo "debug notifications" |
| -- |

The second type is where the command is triggered by a "symbol" from within the content of a message, eg:

| debug notifications `$todo` |
| -- |

For the purposes of discussion I'll refer to the first type as "direct commands" and the second type as "interpreted commands".

## Direct commands

Direct commands take the form:
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

Direct commands also form the basic pattern of a CLI, when a direct command is
performed you are essentially interacting with the CLI.

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
