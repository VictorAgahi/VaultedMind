export class ApiKey {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly hashedKey: string,
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly lastUsedAt?: Date,
  ) {}
}
