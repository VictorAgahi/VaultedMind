/**
 * Pure Domain Entity for User.
 * No framework decorators here.
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt?: Date,
  ) {}

  /**
   * Domain logic example: check if user is deleted.
   */
  public isDeleted(): boolean {
    return !!this.deletedAt;
  }
}
