/**
 * Query Bus — dispatches read operations to their handlers.
 * Queries are side-effect free.
 */

export interface Query {
  readonly queryType: string;
}

export interface QueryHandler<TQuery extends Query, TResult> {
  execute(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
  dispatch<TResult>(query: Query): Promise<TResult>;
  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>,
  ): void;
}
