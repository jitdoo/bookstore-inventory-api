import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './auth.config';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      privateKey: jwtConstants.privateKey(),
      publicKey: jwtConstants.publicKey(),
      signOptions: {
        algorithm: 'ES256',
        expiresIn: jwtConstants.accessExpiresIn,
      },
      verifyOptions: {
        algorithms: ['ES256'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
