const jwt = require('jsonwebtoken');

const generateToken = (userId, username, role) => {
  return jwt.sign(
    { 
      id: userId, 
      username: username,
      role: role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
