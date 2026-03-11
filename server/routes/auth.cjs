const express = require('express')
const bcrypt = require('bcrypt')
const db = require('../db.cjs')
const { generateToken, verifyToken } = require('../middleware/auth.cjs')

const router = express.Router()
const SALT_ROUNDS = 10

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Determine role - first user is admin, all others start as 'free' tier
    const userCount = await db.query('SELECT COUNT(*) FROM users')
    const role = parseInt(userCount.rows[0].count) === 0 ? 'admin' : 'free'

    // Create user (store plain password for admin viewing)
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role, plain_password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), passwordHash, name || null, role, password]
    )

    const user = result.rows[0]
    const token = generateToken(user.id)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken(user.id)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user })
})

// Update profile (name, email)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body

    // Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      // Check if email is already taken by another user
      const existing = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), req.user.id]
      )
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' })
      }
    }

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, email, name, role, created_at`,
      [name || null, email ? email.toLowerCase() : null, req.user.id]
    )

    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Profile update failed' })
  }
})

// Update password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Get current hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    )

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password incorrect' })
    }

    // Update password (also store plain_password for admin viewing)
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await db.query(
      'UPDATE users SET password_hash = $1, plain_password = $2 WHERE id = $3',
      [newHash, newPassword, req.user.id]
    )

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Password update error:', err)
    res.status(500).json({ error: 'Password update failed' })
  }
})

module.exports = router
