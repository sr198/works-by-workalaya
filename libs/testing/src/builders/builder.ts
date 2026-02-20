/**
 * Abstract Builder base class.
 *
 * Subclasses implement `defaults()` to provide a baseline object.
 * `with(key, value)` applies overrides fluently.
 * `build()` merges defaults with overrides.
 *
 * Usage:
 *   class UserBuilder extends Builder<User> {
 *     protected defaults(): User {
 *       return { id: 'u1', name: 'Alice', email: 'alice@example.com' };
 *     }
 *   }
 *
 *   const user = new UserBuilder().with('name', 'Bob').build();
 */
export abstract class Builder<T> {
  protected abstract defaults(): T;
  protected overrides: Partial<T> = {};

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.overrides[key] = value;
    return this;
  }

  build(): T {
    return { ...this.defaults(), ...this.overrides };
  }
}
