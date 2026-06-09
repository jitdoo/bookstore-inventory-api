import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Routes explicitly allowed even when a password change is pending
    const isAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAllowed) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { mustChangePassword?: boolean } }>();

    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'You must change your password before continuing',
      );
    }

    return true;
  }
}
