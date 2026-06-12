import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PasswordChangeRequiredGuard } from './password-change-required.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';

describe('PasswordChangeRequiredGuard', () => {
  let guard: PasswordChangeRequiredGuard;
  let reflector: Reflector;

  const mockContext = (
    user: { mustChangePassword?: boolean } | undefined,
  ): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PasswordChangeRequiredGuard(reflector);
  });

  it('allows when the user does not need to change password', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ mustChangePassword: false }))).toBe(
      true,
    );
  });

  it('blocks when the user must change password', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(() =>
      guard.canActivate(mockContext({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);
  });

  it('allows @AllowPasswordChange routes even when a change is pending', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) =>
        key === ALLOW_PASSWORD_CHANGE_KEY ? true : undefined,
      );
    expect(guard.canActivate(mockContext({ mustChangePassword: true }))).toBe(
      true,
    );
  });

  it('allows public routes regardless of password status', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === IS_PUBLIC_KEY ? true : undefined));
    expect(guard.canActivate(mockContext({ mustChangePassword: true }))).toBe(
      true,
    );
  });
});
