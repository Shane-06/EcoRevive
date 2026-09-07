const { requireRole } = require('../middleware/rbac.middleware');

describe('Milestone 4 — Role-Based Access Control (RBAC) Tests', () => {
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockRes = {};
    nextFn = jest.fn();
  });

  describe('Admin-only Protection (SRS-RBAC-02)', () => {
    const adminOnly = requireRole('admin');

    it('should allow admin users through', () => {
      const req = { user: { id: 'admin-uuid', role: 'admin' } };
      adminOnly(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject contributor users with 403 Forbidden', () => {
      const req = { user: { id: 'contrib-uuid', role: 'contributor' } };
      adminOnly(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should reject caretaker users with 403 Forbidden', () => {
      const req = { user: { id: 'caretaker-uuid', role: 'caretaker' } };
      adminOnly(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('Caretaker or Admin Operations', () => {
    const caretakerOrAdmin = requireRole('caretaker', 'admin');

    it('should allow caretaker users through', () => {
      const req = { user: { id: 'caretaker-uuid', role: 'caretaker' } };
      caretakerOrAdmin(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should allow admin users through', () => {
      const req = { user: { id: 'admin-uuid', role: 'admin' } };
      caretakerOrAdmin(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject contributor users with 403 Forbidden', () => {
      const req = { user: { id: 'contrib-uuid', role: 'contributor' } };
      caretakerOrAdmin(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      const err = nextFn.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('Unauthenticated Request Handling', () => {
    it('should reject requests without req.user with 401 Unauthorized', () => {
      const req = {};
      const middleware = requireRole('contributor');
      middleware(req, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      const err = nextFn.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});
