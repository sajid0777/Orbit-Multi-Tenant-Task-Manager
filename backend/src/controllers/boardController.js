const prisma = require('../config/database');
const { tenantAccess } = require('./tenantController');

async function listBoards(req, res) {
  try {
    const tenant = await tenantAccess(req.user.userId, req.params.tenantId);
    if (!tenant) return res.status(403).json({ message: 'Tenant not found or access denied.' });
    const boards = await prisma.board.findMany({ where: { tenantId: tenant.id }, include: { columns: { orderBy: { position: 'asc' } }, _count: { select: { tasks: true } } }, orderBy: { createdAt: 'asc' } });
    res.json({ boards });
  } catch (e) { console.error('List boards:', e); res.status(500).json({ message: 'Failed to retrieve boards.' }); }
}

async function createBoard(req, res) {
  try {
    const { tenantId, name, description } = req.body || {};
    if (typeof tenantId !== 'string' || typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'tenantId and board name are required.' });
    const tenant = await tenantAccess(req.user.userId, tenantId);
    if (!tenant) return res.status(403).json({ message: 'Tenant not found or access denied.' });
    const tm = tenant.memberships?.[0];
    const orgAdmin = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: req.user.userId, organizationId: tenant.organizationId } } });
    if (!(tm?.role === 'TENANT_ADMIN' || ['OWNER', 'ADMIN'].includes(orgAdmin?.role))) return res.status(403).json({ message: 'Only tenant admins can create boards.' });
    const board = await prisma.$transaction(async tx => {
      const project = await tx.project.create({ data: { name: name.trim(), description: typeof description === 'string' ? description.trim() || null : null, organizationId: tenant.organizationId, tenantId } });
      const b = await tx.board.create({ data: { name: name.trim(), description: typeof description === 'string' ? description.trim() || null : null, organizationId: tenant.organizationId, tenantId, projectId: project.id } });
      await tx.boardColumn.createMany({ data: [{ name: 'To Do', position: 0, boardId: b.id }, { name: 'In Progress', position: 1, boardId: b.id }, { name: 'Review', position: 2, boardId: b.id }, { name: 'Done', position: 3, boardId: b.id }] });
      return tx.board.findUnique({ where: { id: b.id }, include: { columns: { orderBy: { position: 'asc' } } } });
    });
    res.status(201).json({ board });
  } catch (e) { console.error('Create board:', e); res.status(500).json({ message: 'Failed to create board.' }); }
}

async function createColumn(req, res) {
  try {
    const { boardId, name, position } = req.body || {};
    if (typeof boardId !== 'string' || typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'boardId and column name are required.' });
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ message: 'Board not found.' });
    const tenant = await tenantAccess(req.user.userId, board.tenantId);
    if (!tenant) return res.status(403).json({ message: 'Access denied.' });
    const role = tenant.memberships?.[0]?.role;
    const orgRole = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: req.user.userId, organizationId: board.organizationId } } });
    if (!(role === 'TENANT_ADMIN' || ['OWNER', 'ADMIN'].includes(orgRole?.role))) return res.status(403).json({ message: 'Only tenant admins can manage columns.' });
    const max = await prisma.boardColumn.aggregate({ where: { boardId }, _max: { position: true } });
    const column = await prisma.boardColumn.create({ data: { boardId, name: name.trim(), position: Number.isInteger(position) && position >= 0 ? position : (max._max.position ?? -1) + 1 } });
    res.status(201).json({ column });
  } catch (e) { console.error('Create column:', e); res.status(500).json({ message: 'Failed to create column.' }); }
}

async function updateColumn(req, res) {
  try {
    const { columnId } = req.params; const { name, position } = req.body || {};
    const column = await prisma.boardColumn.findUnique({ where: { id: columnId }, include: { board: true } });
    if (!column) return res.status(404).json({ message: 'Column not found.' });
    const tenant = await tenantAccess(req.user.userId, column.board.tenantId);
    if (!tenant) return res.status(403).json({ message: 'Access denied.' });
    const role = tenant.memberships?.[0]?.role;
    const orgRole = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: req.user.userId, organizationId: column.board.organizationId } } });
    if (!(role === 'TENANT_ADMIN' || ['OWNER', 'ADMIN'].includes(orgRole?.role))) return res.status(403).json({ message: 'Only tenant admins can manage columns.' });
    const data = {}; if (typeof name === 'string' && name.trim()) data.name = name.trim(); if (Number.isInteger(position) && position >= 0) data.position = position;
    const updated = await prisma.boardColumn.update({ where: { id: columnId }, data }); res.json({ column: updated });
  } catch (e) { console.error('Update column:', e); res.status(500).json({ message: 'Failed to update column.' }); }
}

async function deleteColumn(req, res) {
  try {
    const column = await prisma.boardColumn.findUnique({ where: { id: req.params.columnId }, include: { board: true } });
    if (!column) return res.status(404).json({ message: 'Column not found.' });
    const tenant = await tenantAccess(req.user.userId, column.board.tenantId); if (!tenant) return res.status(403).json({ message: 'Access denied.' });
    const role = tenant.memberships?.[0]?.role; const orgRole = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: req.user.userId, organizationId: column.board.organizationId } } });
    if (!(role === 'TENANT_ADMIN' || ['OWNER', 'ADMIN'].includes(orgRole?.role))) return res.status(403).json({ message: 'Only tenant admins can manage columns.' });
    await prisma.boardColumn.delete({ where: { id: column.id } }); res.json({ message: 'Column deleted.' });
  } catch (e) { console.error('Delete column:', e); res.status(500).json({ message: 'Failed to delete column.' }); }
}

async function deleteBoard(req, res) {
  try {
    const board = await prisma.board.findUnique({ where: { id: req.params.boardId } }); if (!board) return res.status(404).json({ message: 'Board not found.' });
    const tenant = await tenantAccess(req.user.userId, board.tenantId); if (!tenant) return res.status(403).json({ message: 'Access denied.' });
    const role = tenant.memberships?.[0]?.role; const orgRole = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: req.user.userId, organizationId: board.organizationId } } });
    if (!(role === 'TENANT_ADMIN' || ['OWNER', 'ADMIN'].includes(orgRole?.role))) return res.status(403).json({ message: 'Only tenant admins can delete boards.' });
    await prisma.project.delete({ where: { id: board.projectId } }); res.json({ message: 'Board and linked project deleted.' });
  } catch (e) { console.error('Delete board:', e); res.status(500).json({ message: 'Failed to delete board.' }); }
}
module.exports = { listBoards, createBoard, createColumn, updateColumn, deleteColumn, deleteBoard };
