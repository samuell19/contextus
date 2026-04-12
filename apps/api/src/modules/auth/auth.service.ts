import crypto from 'node:crypto';

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { RefreshTokenPayload } from '../../common/auth.js';
import { AppError } from '../../common/http.js';
import { durationToSeconds, env } from '../../config/env.js';
import { AuthSession, User } from '../../models/index.js';

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;

type SessionMetadata = {
  userAgent: string | null;
  ipAddress: string | null;
};

export class AuthService {
  public async register(input: {
    email: string;
    password: string;
    metadata: SessionMetadata;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      throw new AppError(409, 'Ja existe uma conta com esse email');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await User.create({ email, passwordHash });
    const refresh = await this.createRefreshSession(user, input.metadata);

    return {
      user,
      accessToken: this.createAccessToken(user),
      refreshToken: refresh.token
    };
  }

  public async login(input: {
    email: string;
    password: string;
    metadata: SessionMetadata;
  }) {
    const email = input.email.trim().toLowerCase();
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError(401, 'Credenciais invalidas');
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.password);

    if (!passwordValid) {
      throw new AppError(401, 'Credenciais invalidas');
    }

    const refresh = await this.createRefreshSession(user, input.metadata);

    return {
      user,
      accessToken: this.createAccessToken(user),
      refreshToken: refresh.token
    };
  }

  public async refresh(refreshToken: string, metadata: SessionMetadata) {
    let payload: RefreshTokenPayload;

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw new AppError(401, 'Refresh token invalido');
    }

    const session = await AuthSession.findByPk(payload.sessionId);

    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, 'Sessao expirada');
    }

    if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
      throw new AppError(401, 'Refresh token invalido');
    }

    const user = await User.findByPk(payload.sub);

    if (!user) {
      throw new AppError(401, 'Usuario nao encontrado');
    }

    const nextToken = this.createRefreshToken(user, session.id);
    session.refreshTokenHash = this.hashToken(nextToken);
    session.expiresAt = new Date(Date.now() + durationToSeconds(env.JWT_REFRESH_TTL) * 1000);
    session.userAgent = metadata.userAgent;
    session.ipAddress = metadata.ipAddress;
    await session.save();

    return {
      user,
      accessToken: this.createAccessToken(user),
      refreshToken: nextToken
    };
  }

  public async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      const session = await AuthSession.findByPk(payload.sessionId);

      if (session) {
        session.revokedAt = new Date();
        await session.save();
      }
    } catch {
      return;
    }
  }

  public createAccessToken(user: User) {
    return jwt.sign({ sub: user.id, email: user.email }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as JwtDuration
    });
  }

  public getAccessTokenTtlSeconds() {
    return durationToSeconds(env.JWT_ACCESS_TTL);
  }

  private async createRefreshSession(user: User, metadata: SessionMetadata) {
    const session = await AuthSession.create({
      userId: user.id,
      refreshTokenHash: '',
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt: new Date(Date.now() + durationToSeconds(env.JWT_REFRESH_TTL) * 1000),
      revokedAt: null
    });

    const token = this.createRefreshToken(user, session.id);
    session.refreshTokenHash = this.hashToken(token);
    await session.save();

    return { session, token };
  }

  private createRefreshToken(user: User, sessionId: string) {
    return jwt.sign({ sub: user.id, email: user.email, sessionId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL as JwtDuration
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
