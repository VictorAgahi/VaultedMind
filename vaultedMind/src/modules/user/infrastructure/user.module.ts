import { Module } from '@nestjs/common';
import { UserService } from '../application/services/user.service.js';

@Module({
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
