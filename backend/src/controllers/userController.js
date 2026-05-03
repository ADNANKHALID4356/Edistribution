const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES, normalizeRoleName } = require('../middleware/auth');

const canActorManageRole = (actorRole, targetRole) => {
  const normalizedActorRole = normalizeRoleName(actorRole);

  return normalizedActorRole === ROLES.ADMIN || normalizedActorRole === ROLES.SENIOR_MANAGER;
};

const getActorRole = (req) => normalizeRoleName(req.user?.role_name || req.user?.role);
const CANONICAL_ROLE_SET = new Set(Object.values(ROLES));

exports.getRoles = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const roles = await User.listRoles();
    const normalizedRoles = roles
      .map((role) => ({ ...role, role_name: normalizeRoleName(role.role_name) }))
      .filter((role) => CANONICAL_ROLE_SET.has(role.role_name));
    const dedupedRoles = normalizedRoles.filter(
      (role, index, arr) => arr.findIndex((item) => item.role_name === role.role_name) === index
    );
    const filteredRoles = canActorManageRole(actorRole, actorRole) ? dedupedRoles : [];

    res.json({
      success: true,
      data: filteredRoles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const result = await User.listUsers(req.query);
    const normalizedUsers = result.users.map((row) => ({
      ...row,
      role_name: normalizeRoleName(row.role_name)
    }));
    const filteredUsers = actorRole === ROLES.ADMIN
      ? normalizedUsers
      : normalizedUsers.filter((managedUser) => canActorManageRole(actorRole, managedUser.role_name));

    res.json({
      success: true,
      data: filteredUsers,
      pagination: {
        ...result.pagination,
        total: filteredUsers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const { username, email, password, full_name, phone, role_name } = req.body;

    if (!username || !password || !full_name || !role_name) {
      return res.status(400).json({
        success: false,
        message: 'username, password, full_name and role_name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const role = await User.findRoleByName(normalizeRoleName(role_name));
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role_name'
      });
    }

    if (!canActorManageRole(actorRole, role.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to assign this role'
      });
    }

    if (await User.usernameExists(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    if (email && await User.emailExists(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = await User.create({
      username,
      email: email || null,
      password: hashedPassword,
      full_name,
      phone: phone || null,
      role_id: role.id
    });
    const user = await User.findById(userId);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const userId = Number(req.params.id);
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!canActorManageRole(actorRole, existingUser.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to manage this user'
      });
    }

    const updatePayload = {};
    const { username, email, full_name, phone, role_name, is_active } = req.body;

    if (username && username !== existingUser.username) {
      if (await User.usernameExists(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      updatePayload.username = username;
    }

    if (email && email !== existingUser.email) {
      if (await User.emailExists(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      updatePayload.email = email;
    }

    if (typeof full_name === 'string') updatePayload.full_name = full_name;
    if (typeof phone === 'string') updatePayload.phone = phone;
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active ? 1 : 0;

    if (role_name) {
      const normalizedRoleName = normalizeRoleName(role_name);
      const role = await User.findRoleByName(normalizedRoleName);
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role_name'
        });
      }

      if (!canActorManageRole(actorRole, role.role_name)) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to assign this role'
        });
      }
      updatePayload.role_id = role.id;
    }

    const updated = await User.updateProfile(userId, updatePayload);
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    const user = await User.findById(userId);
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const userId = Number(req.params.id);
    const { is_active } = req.body;
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!canActorManageRole(actorRole, existingUser.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to manage this user'
      });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be boolean'
      });
    }

    await User.updateActiveStatus(userId, is_active ? 1 : 0);
    const user = await User.findById(userId);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const userId = Number(req.params.id);
    const { new_password } = req.body;
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!canActorManageRole(actorRole, existingUser.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to reset this user password'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'new_password must be at least 6 characters long'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    await User.updatePassword(userId, hashedPassword);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const actorRole = getActorRole(req);
    const actorId = Number(req.user?.id);
    const userId = Number(req.params.id);
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (actorId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    if (!canActorManageRole(actorRole, existingUser.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this user'
      });
    }

    await User.deleteById(userId);
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};
