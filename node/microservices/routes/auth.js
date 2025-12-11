let express = require('express');
let router = express.Router();
let Mongoose = require('mongoose').Mongoose;
let Schema = require('mongoose').Schema;
let crypto = require('crypto');
const RabbitMQHelper = require('../utils/rabbitmq');
require('dotenv').config();

const rabbitMQ = new RabbitMQHelper();

// MongoDB connection
let mongoose = new Mongoose();
mongoose.connect(process.env.MONGODB_URI_AUTH);

// User Schema
let userSchema = new Schema({
  username: { type: String, required: true, unique: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  salt: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'userData' });

let User = mongoose.model('User', userSchema);

// Global variable to store current logged-in user
let currentUser = null;

// Helper functions
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16);
  } else if (typeof salt === 'string') {
    salt = Buffer.from(salt, 'hex');
  }
  
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
  return {
    salt: salt.toString('hex'),
    password_hash: hash.toString('hex')
  };
}

function verifyPassword(storedHash, storedSalt, providedPassword) {
  try {
    const { password_hash } = hashPassword(providedPassword, storedSalt);
    return password_hash === storedHash;
  } catch (error) {
    return false;
  }
}

function serializeUser(user, hideSensitive = true) {
  if (!user) return null;
  
  const serialized = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    created_at: user.created_at
  };
  
  if (!hideSensitive) {
    serialized.password_hash = user.password_hash;
    serialized.salt = user.salt;
  }
  
  return serialized;
}

// Get all users
router.get('/users', async function (req, res) {
  try {
    const users = await User.find({}, { password_hash: 0, salt: 0 });
    res.json(users.map(user => serializeUser(user)));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Get user by username
router.get('/users/:username', async function (req, res) {
  try {
    const user = await User.findOne({ username: req.params.username }, { password_hash: 0, salt: 0 });
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }
    res.json(serializeUser(user));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Register new user
router.post('/register', async function (req, res) {
  try {
    const { username, password, email } = req.body;
    
    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ detail: "Username already exists" });
    }
    
    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ detail: "Email already registered" });
    }
    
    // Hash password
    const { salt, password_hash } = hashPassword(password);
    
    // Create user
    const user = new User({
      username,
      email,
      password_hash,
      salt,
      created_at: new Date()
    });
    
    const savedUser = await user.save();
    res.json({ message: "User registered successfully", id: savedUser._id.toString() });
  } catch (error) {
    res.status(500).json({ detail: "Registration failed" });
  }
});

// Update user
router.put('/users/:username', async function (req, res) {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }
    
    const updateFields = {};
    
    if (req.body.email) {
      // Check if email is used by another user
      const existingEmail = await User.findOne({ 
        email: req.body.email, 
        username: { $ne: req.params.username } 
      });
      if (existingEmail) {
        return res.status(400).json({ detail: "Email already in use" });
      }
      updateFields.email = req.body.email;
    }
    
    if (req.body.password) {
      const { salt, password_hash } = hashPassword(req.body.password);
      updateFields.password_hash = password_hash;
      updateFields.salt = salt;
    }
    
    if (Object.keys(updateFields).length === 0) {
      return res.json({ message: "No changes provided" });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: updateFields },
      { new: true, projection: { password_hash: 0, salt: 0 } }
    );
    
    res.json(serializeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ detail: "Update failed" });
  }
});

// Delete user
router.delete('/users/:username', async function (req, res) {
  try {
    const result = await User.deleteOne({ username: req.params.username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Get current user
router.get('/current-user', function (req, res) {
  if (currentUser) {
    res.json({ user: currentUser, isLoggedIn: true });
  } else {
    res.json({ user: null, isLoggedIn: false });
  }
});

// Logout user
router.post('/logout', async function (req, res) {
  try {
    // Clear current user
    currentUser = null;
    
    // Notify timetrack service about logout via RabbitMQ
    try {
      await rabbitMQ.publishMessage('user_logout', { action: 'logout' });
    } catch (error) {
      console.error('Failed to notify timetrack service via RabbitMQ:', error);
    }
    
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Login user
router.post('/login', async function (req, res) {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ detail: "Invalid username or password" });
    }
    
    const isValid = verifyPassword(user.password_hash, user.salt, password);
    if (!isValid) {
      return res.status(400).json({ detail: "Invalid username or password" });
    }
    
    // Store current user globally
    currentUser = serializeUser(user);
    
    // Notify timetrack service about logged-in user via RabbitMQ
    try {
      await rabbitMQ.publishMessage('user_login', { user_id: user._id.toString(), username: user.username });
    } catch (error) {
      console.error('Failed to notify timetrack service via RabbitMQ:', error);
    }
    
    const token = `token-${username}`;
    res.json({
      access_token: token,
      token_type: "successful",
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;