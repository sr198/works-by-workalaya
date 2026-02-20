/**
 * Command Bus — dispatches write operations to their handlers.
 * Commands represent intentions to change state.
 */

export interface Command {
  readonly commandType: string;
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  dispatch<TResult>(command: Command): Promise<TResult>;
  register<TCommand extends Command, TResult>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>,
  ): void;
}
