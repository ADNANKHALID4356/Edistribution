const express = require('express');
const router = express.Router();
const { protect, authorize, ROLES } = require('../../middleware/auth');
const userController = require('../../controllers/userController');

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER));

router.get('/roles', userController.getRoles);
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUserStatus);
router.patch('/:id/password', userController.resetUserPassword);
router.delete('/:id', userController.deleteUser);

module.exports = router;
