import { createHash } from 'crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import { UserEntity, UserGroupEntity, UserRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { User } from '../interfaces';
import { buildUser } from './utils';

type Values = Pick<User, 'apiKey' | 'email' | 'name' | 'userGroupIds'> & { password?: string };

export class CreateUser {
  constructor(public readonly values: Values) {}
}

export class CreateUserResponse {
  constructor(public readonly user: User) {}
}

@CommandHandler(CreateUser)
export class CreateUserHandler implements ICommandHandler<CreateUser, CreateUserResponse> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
  ) {}

  async execute(request: CreateUser): Promise<CreateUserResponse> {
    const { values } = request;
    const { apiKey, email, name, password, userGroupIds } = values;

    const entity = this.users.create({ id: uuid.v4() });

    if (password) {
      entity.passwordHash = await bcrypt.hash(password, 10);
    }

    if (apiKey) {
      entity.apiKey = createHash('sha256').update(apiKey).digest('hex');
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { email, name });
    if (userGroupIds && userGroupIds.length > 0) {
      entity.userGroups = userGroupIds.map((id) => ({ id }) as UserGroupEntity);
    } else {
      entity.userGroups = [];
    }

    // Use the save method otherwise we would not get previous values.
    const created = await this.users.save(entity);
    const result = buildUser(created);

    return new CreateUserResponse(result);
  }
}
