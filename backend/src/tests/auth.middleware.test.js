const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth.middleware');
const config = require('../config');

describe('Milestone 4 — Auth Middleware Unit Tests', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    nextFn = jest.fn();
  });

  it('should pass and attach req.user when valid token is supplied', () => {
    const token = jwt.sign({ id: 'test-uuid-1234', role: 'contributor' }, config.jwt.secret, {
      expiresIn: '1h',
    });
    mockReq.headers.authorization = `Bearer ${token}`;

    authenticate(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalledWith();
    expect(mockReq.user).toEqual({
      id: 'test-uuid-1234',
      role: 'contributor',
    });
  });

  it('should call next with UnauthorizedError when token is expired', () => {
    // Generate an already expired token
    const expiredToken = jwt.sign(
      { id: 'test-uuid-1234', role: 'contributor' },
      config.jwt.secret,
      { expiresIn: '-1s' }
    );
    mockReq.headers.authorization = `Bearer ${expiredToken}`;

    authenticate(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('TOKEN_EXPIRED');
  });

  it('should call next with UnauthorizedError when token is signed with wrong secret', () => {
    const forgedToken = jwt.sign(
      { id: 'test-uuid-1234', role: 'admin' },
      'wrong_unauthorized_secret'
    );
    mockReq.headers.authorization = `Bearer ${forgedToken}`;

    authenticate(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
    const err = nextFn.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_TOKEN');
  });
});
