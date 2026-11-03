const prisma = require('../config/database');

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'workspace';

async function orgRole(userId, organizationId) {
  return prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
}

async function tenantAccess(userId, tenantId) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organization: {
        members: {
          some: { userId }
        }
      }
    },
    include: {
      memberships: {
        where: { userId },
        select: { role: true }
      }
    }
  });

  return tenant;
}




async function listTenants(req, res) {
  try {
    const { organizationId } = req.params;

    const membership = await orgRole(req.user.userId, organizationId);

    if (!membership) {
      return res.status(403).json({
        message: 'You are not a member of this organization.'
      });
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        organizationId
      },
      include: {
        _count: {
          select: {
            memberships: true,
            boards: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return res.json({ tenants });
  } catch (e) {
    console.error('List tenants:', e);
    return res.status(500).json({
      message: 'Failed to retrieve tenants.'
    });
  }
}



async function createTenant(req, res) {
  try {
    const { organizationId, name } = req.body || {};
    if (typeof organizationId !== 'string' || !organizationId.trim() || typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'organizationId and tenant name are required.' });
    const membership = await orgRole(req.user.userId, organizationId);
    if (!membership) return res.status(403).json({ message: 'You are not a member of this organization.' });
    if (!['OWNER', 'ADMIN'].includes(membership.role)) return res.status(403).json({ message: 'Only organization admins can create tenants.' });
    const baseSlug = slugify(name); let slug = baseSlug; let n = 1;
    while (await prisma.tenant.findUnique({ where: { organizationId_slug: { organizationId, slug } } })) slug = `${baseSlug}-${++n}`;
    const tenant = await prisma.$transaction(async tx => {
      const created = await tx.tenant.create({ data: { name: name.trim(), slug, organizationId } });
      await tx.tenantMembership.create({ data: { tenantId: created.id, userId: req.user.userId, role: 'TENANT_ADMIN' } });
      return created;
    });
    res.status(201).json({ tenant });
  } catch (e) { console.error('Create tenant:', e); res.status(500).json({ message: 'Failed to create tenant.' }); }
}

async function addTenantMember(req, res) {
  try {
    const { tenantId } = req.params; const { email, role = 'MEMBER' } = req.body || {};
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found.' });
    const orgMembership = await orgRole(req.user.userId, tenant.organizationId);
    const ownTenantMembership = await prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId: req.user.userId } } });
    if (!((orgMembership && ['OWNER', 'ADMIN'].includes(orgMembership.role)) || ownTenantMembership?.role === 'TENANT_ADMIN')) return res.status(403).json({ message: 'Only organization or tenant admins can manage tenant members.' });
    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ message: 'A valid user email is required.' });
    if (!['TENANT_ADMIN', 'MEMBER'].includes(role)) return res.status(400).json({ message: 'Role must be TENANT_ADMIN or MEMBER.' });
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.status(404).json({ message: 'No registered user was found with that email.' });
    const orgUser = await orgRole(user.id, tenant.organizationId);
    if (!orgUser) return res.status(400).json({ message: 'User must be an organization member before being added to a tenant.' });
    const membership = await prisma.tenantMembership.upsert({ where: { tenantId_userId: { tenantId, userId: user.id } }, create: { tenantId, userId: user.id, role }, update: { role } });
    res.status(201).json({ membership: { ...membership, user: { id: user.id, name: user.name, email: user.email } } });
  } catch (e) { console.error('Add tenant member:', e); res.status(500).json({ message: 'Failed to add tenant member.' }); }
}

async function listTenantMembers(req, res) {
  try {
    const tenant = await tenantAccess(req.user.userId, req.params.tenantId);
    if (!tenant) return res.status(403).json({ message: 'Tenant not found or access denied.' });
    const memberships = await prisma.tenantMembership.findMany({ where: { tenantId: tenant.id }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
    res.json({ memberships });
  } catch (e) { console.error('List tenant members:', e); res.status(500).json({ message: 'Failed to retrieve tenant members.' }); }
}

module.exports = { listTenants, createTenant, addTenantMember, listTenantMembers, tenantAccess };
