import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, jwtConstants } from './auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.publicKey(),
      algorithms: ['ES256'],
    });
  }

  validate(payload: JwtPayload) {
    // The returned value is injected into request.user
    return { userId: payload.sub, role: payload.role };
  }
}
