const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { listTenants, createTenant, addTenantMember, listTenantMembers } = require('../controllers/tenantController');
const router = express.Router(); router.use(authenticateToken);
router.get('/organization/:organizationId', listTenants);
router.post('/', createTenant);
router.get('/:tenantId/members', listTenantMembers);
router.post('/:tenantId/members', addTenantMember);
module.exports = router;
