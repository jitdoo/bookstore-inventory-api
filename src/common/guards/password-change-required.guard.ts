import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    // Public routes and the password-change route itself are exempt
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const isAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      targets,
    );
    if (isPublic || isAllowed) {
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
