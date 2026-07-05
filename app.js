const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const os = require('os');

const app = express();
const PORT = 3000;

// ============= GET LOCAL IP ADDRESS =============
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
// ============= DATABASE CONNECTION =============
let db;

// Check if running on Render (has DATABASE_URL)
if (process.env.DATABASE_URL) {
    // Running on Render — use PostgreSQL
    const { Client } = require('pg');
    db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    db.connect()
        .then(() => console.log('✅ Connected to PostgreSQL (Render)'))
        .catch(err => console.error('PostgreSQL connection failed:', err));
} else {
    // Running locally — use MySQL (XAMPP)
    const mysql = require('mysql2');
    db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'neuroprint_db'
    });
    db.connect((err) => {
        if (err) {
            console.error('Database connection failed:', err);
            return;
        }
        console.log('✅ Connected to MySQL (Local)');
    });
}

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL database');
});

// ============= EMAIL REPORT SYSTEM =============
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'faizah5810@gmail.com',
        pass: 'udgy dqtk sjma qfiq'
    }
});

async function generateWeeklyReport(userId, userEmail, userName, scans) {
    if (!scans || scans.length === 0) return null;
    
    const totalScans = scans.length;
    let calmCount = 0;
    let stressCount = 0;
    let riskSum = 0;
    
    scans.forEach(scan => {
        if (scan.emotion_estimate === 'Confident / Calm' || scan.emotion_estimate === 'Efficient') {
            calmCount++;
        }
        if (scan.emotion_estimate === 'Stress' || scan.emotion_estimate === 'Anxious') {
            stressCount++;
        }
        if (scan.risk_level === 'High') riskSum += 80;
        else if (scan.risk_level === 'Medium') riskSum += 50;
        else riskSum += 20;
    });
    
    const calmRate = Math.round((calmCount / totalScans) * 100);
    const stressRate = Math.round((stressCount / totalScans) * 100);
    const avgRisk = Math.round(riskSum / totalScans);
    const moodScore = 100 - avgRisk;
    
    let wellnessTip = '';
    if (calmRate > 70) {
        wellnessTip = 'Excellent! Your calm session rate is outstanding. Keep maintaining this positive behavior pattern.';
    } else if (calmRate > 50) {
        wellnessTip = 'Good progress! You have more calm sessions than stressed ones. Try adding a 2-minute breathing exercise.';
    } else if (stressRate > 50) {
        wellnessTip = 'Your stress indicators are above average. Consider taking short breaks between tasks.';
    } else {
        wellnessTip = 'Your emotional patterns show healthy variation. Stay hydrated and maintain regular sleep schedules.';
    }
    
    const date = new Date();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>NeuroPrint AI - Weekly Wellness Report</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', 'Poppins', Arial, sans-serif;
                    background: linear-gradient(135deg, #0a0a0a 0%, #0d1117 100%);
                    padding: 40px 20px;
                }
                .container {
                    max-width: 580px;
                    margin: 0 auto;
                    background: #0f0f16;
                    border-radius: 32px;
                    padding: 0;
                    overflow: hidden;
                    border: 1px solid rgba(0, 212, 255, 0.3);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 212, 255, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 255, 136, 0.08));
                    padding: 30px 25px 20px;
                    text-align: center;
                    border-bottom: 1px solid rgba(0, 212, 255, 0.2);
                }
                .header-icon { font-size: 48px; margin-bottom: 10px; }
                h1 {
                    font-family: 'Orbitron', monospace;
                    font-size: 28px;
                    font-weight: 900;
                    background: linear-gradient(135deg, #00d4ff, #00ff88);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                }
                .subtitle { font-size: 12px; color: #888; letter-spacing: 2px; }
                .week-badge {
                    display: inline-block;
                    background: rgba(0, 212, 255, 0.15);
                    padding: 6px 16px;
                    border-radius: 40px;
                    font-size: 11px;
                    color: #00d4ff;
                    margin-top: 12px;
                    font-family: monospace;
                }
                .content { padding: 30px 25px; }
                .greeting { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
                .greeting span { background: linear-gradient(135deg, #00d4ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .stats-grid { display: flex; justify-content: space-between; gap: 15px; margin: 25px 0; }
                .stat-card { flex: 1; background: rgba(20, 20, 30, 0.6); border-radius: 20px; padding: 18px 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
                .stat-value { font-size: 32px; font-weight: 800; font-family: monospace; }
                .stat-value.cyan { color: #00d4ff; }
                .stat-value.green { color: #00ff88; }
                .stat-value.orange { color: #ffaa00; }
                .stat-label { font-size: 11px; color: #888; margin-top: 6px; letter-spacing: 1px; }
                .insight-card {
                    background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(0, 255, 136, 0.04));
                    border-radius: 20px;
                    padding: 20px;
                    margin: 25px 0;
                    border-left: 3px solid #00ff88;
                }
                .insight-title { font-size: 12px; font-weight: 700; color: #00ff88; letter-spacing: 2px; margin-bottom: 10px; }
                .insight-text { color: #ccc; font-size: 14px; line-height: 1.6; }
                .breakdown { display: flex; justify-content: space-around; gap: 20px; margin: 25px 0; }
                .breakdown-item { text-align: center; flex: 1; background: rgba(20, 20, 30, 0.4); border-radius: 16px; padding: 15px; }
                .breakdown-emoji { font-size: 28px; margin-bottom: 8px; }
                .breakdown-count { font-size: 24px; font-weight: 700; }
                .breakdown-count.calm { color: #00ff88; }
                .breakdown-count.stress { color: #ff0040; }
                .breakdown-label { font-size: 11px; color: #888; margin-top: 5px; }
                .cta-button {
                    display: block;
                    text-align: center;
                    background: linear-gradient(135deg, #00d4ff20, #00ff8820);
                    border: 1px solid #00d4ff;
                    border-radius: 50px;
                    padding: 14px 20px;
                    margin: 25px 0 15px;
                    text-decoration: none;
                    color: #00d4ff;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s;
                }
                .cta-button:hover {
                    background: linear-gradient(135deg, #00d4ff40, #00ff8840);
                    box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
                }
                .footer {
                    background: rgba(0,0,0,0.3);
                    padding: 20px 25px;
                    text-align: center;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .footer-text { font-size: 10px; color: #555; line-height: 1.5; }
                .footer-text a { color: #00d4ff; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-icon">🧠🔐</div>
                    <h1>NEUROPRINT AI</h1>
                    <div class="subtitle">INTELLIGENT BEHAVIOR SYSTEM</div>
                    <div class="week-badge">📅 WEEK OF ${weekStart.toLocaleDateString()} — ${weekEnd.toLocaleDateString()}</div>
                </div>
                <div class="content">
                    <div class="greeting">Hello <span>${userName}</span> 👤</div>
                    <div class="stats-grid">
                        <div class="stat-card"><div class="stat-value cyan">${totalScans}</div><div class="stat-label">TOTAL SCANS</div></div>
                        <div class="stat-card"><div class="stat-value green">${calmRate}%</div><div class="stat-label">CALM RATE</div></div>
                        <div class="stat-card"><div class="stat-value orange">${moodScore}%</div><div class="stat-label">MOOD SCORE</div></div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-title">🌿 AI WELLNESS INSIGHT</div>
                        <div class="insight-text">${wellnessTip}</div>
                    </div>
                    <div class="breakdown">
                        <div class="breakdown-item"><div class="breakdown-emoji">😌 CALM</div><div class="breakdown-count calm">${calmCount}</div><div class="breakdown-label">sessions</div></div>
                        <div class="breakdown-item"><div class="breakdown-emoji">😰 STRESS</div><div class="breakdown-count stress">${stressCount}</div><div class="breakdown-label">sessions</div></div>
                    </div>
                    <a href="http://localhost:3000/alerts" class="cta-button">🔗 VIEW YOUR PERSONAL HUB →</a>
                </div>
                <div class="footer">
                    <div class="footer-text">
                        NeuroPrint AI — Intelligent Behavior Authentication & Emotion Detection System<br>
                        This report is automatically generated weekly. You received this because you are registered with NeuroPrint AI.<br>
                        <a href="#">Manage preferences</a> | <a href="#">Unsubscribe</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return {
        to: userEmail,
        subject: `🧠 NeuroPrint AI — Weekly Wellness Report (${weekStart.toLocaleDateString()})`,
        html: htmlContent
    };
}

async function sendWeeklyReports() {
    console.log('📧 Running weekly email report...');
    
    db.query('SELECT id, fullname, email FROM users', async (err, users) => {
        if (err) {
            console.log('Error fetching users:', err);
            return;
        }
        
        for (const user of users) {
            const sql = `SELECT * FROM fingerprint_scans WHERE user_id = ? AND scanned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY scanned_at DESC`;
            
            db.query(sql, [user.id], async (err, scans) => {
                if (err || scans.length === 0) {
                    console.log(`No scans for ${user.email}, skipping...`);
                    return;
                }
                
                const emailData = await generateWeeklyReport(user.id, user.email, user.fullname, scans);
                if (emailData) {
                    emailTransporter.sendMail(emailData, (error, info) => {
                        if (error) {
                            console.log(`❌ Failed to send email to ${user.email}:`, error);
                        } else {
                            console.log(`✅ Weekly report sent to ${user.email}`);
                        }
                    });
                }
            });
        }
    });
}

cron.schedule('0 8 * * 0', () => {
    console.log('🕐 Running scheduled weekly report...');
    sendWeeklyReports();
});

app.post('/api/send-weekly-report', (req, res) => {
    sendWeeklyReports();
    res.json({ success: true, message: 'Weekly reports triggered' });
});

console.log('📧 Email reporting system initialized');

// ============= SERVE HTML PAGES =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/alerts', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'alerts.html'));
});

app.get('/wellness', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'wellness.html'));
});

app.get('/reflect-gratitude', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reflect-gratitude.html'));
});

app.get('/echo-alter', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'echo-alter.html'));
});

// ============= API: REGISTER =============
app.post('/api/register', (req, res) => {
    const { fullname, email, password, behavior_data } = req.body;
    
    const sql = `INSERT INTO users (fullname, email, password_hash, fingerprint_template) 
                 VALUES (?, ?, ?, ?)`;
    
    db.query(sql, [fullname, email, password, JSON.stringify(behavior_data)], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, message: 'Registration failed' });
        } else {
            res.json({ success: true, message: 'User registered', userId: result.insertId });
        }
    });
});

// ============= API: CHECK IDENTITY =============
app.post('/api/check-identity', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }
    
    const sql = 'SELECT id, fullname, email FROM users WHERE email = ? AND password_hash = ?';
    
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        if (results.length === 0) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        const user = results[0];
        res.json({
            success: true,
            message: 'Identity verified',
            user: { id: user.id, name: user.fullname, email: user.email }
        });
    });
});

// ============= API: LOGIN =============
app.post('/api/login', (req, res) => {
    const { email, behavior_data } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
        if (err || users.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        
        const user = users[0];
        const analysis = analyzeBehavior(behavior_data);
        
        const logSql = `INSERT INTO fingerprint_scans 
                        (user_id, scan_duration_ms, pressure_simulated, retry_count, 
                         interaction_speed, emotion_estimate, risk_level, is_successful)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(logSql, [
            user.id,
            behavior_data.duration,
            behavior_data.pressure,
            behavior_data.retry,
            behavior_data.speed,
            analysis.emotion,
            analysis.risk,
            true
        ]);
        
        if (analysis.risk === 'High') {
            const alertSql = `INSERT INTO security_alerts (user_id, alert_type, description) 
                              VALUES (?, ?, ?)`;
            db.query(alertSql, [
                user.id,
                'Suspicious Behavior',
                `High risk detected: ${analysis.emotion} with ${behavior_data.retry} retries`
            ]);
        }
        
        res.json({
            success: true,
            user: { id: user.id, name: user.fullname, email: user.email },
            analysis: analysis
        });
    });
});

// ============= API: GET USER SCAN HISTORY =============
app.get('/api/user/:userId/scans', (req, res) => {
    const userId = req.params.userId;
    
    const sql = `SELECT * FROM fingerprint_scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 50`;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, message: 'Failed to fetch scans' });
        } else {
            res.json({ success: true, scans: results });
        }
    });
});

// ============= API: GET ALL ALERTS =============
app.get('/api/alerts', (req, res) => {
    const { status, search } = req.query;
    
    let sql = `SELECT sa.*, u.fullname, u.email 
               FROM security_alerts sa
               JOIN users u ON sa.user_id = u.id
               WHERE 1=1`;
    
    const params = [];
    
    if (status === 'unresolved') {
        sql += ` AND sa.is_resolved = FALSE`;
    } else if (status === 'resolved') {
        sql += ` AND sa.is_resolved = TRUE`;
    }
    
    if (search) {
        sql += ` AND (u.fullname LIKE ? OR u.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY sa.created_at DESC`;
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
        } else {
            res.json({ success: true, alerts: results });
        }
    });
});

// ============= API: GET ALERTS FOR SPECIFIC USER =============
app.get('/api/alerts/user/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const sql = `SELECT * FROM security_alerts WHERE user_id = ? ORDER BY created_at DESC`;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
        } else {
            res.json({ success: true, alerts: results });
        }
    });
});

// ============= API: RESOLVE ALERT =============
app.put('/api/alerts/:id/resolve', (req, res) => {
    const alertId = req.params.id;
    
    const sql = `UPDATE security_alerts SET is_resolved = TRUE WHERE id = ?`;
    
    db.query(sql, [alertId], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, message: 'Failed to resolve alert' });
        } else {
            res.json({ success: true, message: 'Alert resolved' });
        }
    });
});

// ============= API: ALERT STATISTICS =============
app.get('/api/alerts/stats', (req, res) => {
    const sql = `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_resolved = FALSE THEN 1 ELSE 0 END) as unresolved,
                    SUM(CASE WHEN is_resolved = TRUE THEN 1 ELSE 0 END) as resolved
                 FROM security_alerts`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, stats: results[0] });
        }
    });
});

// ============= BEHAVIOR ANALYSIS LOGIC =============
function analyzeBehavior(data) {
    let emotion = 'Neutral';
    let risk = 'Low';
    
    const { duration, pressure, retry, speed } = data;
    
    if (pressure > 70 && retry > 2) {
        emotion = 'Stress';
        risk = 'High';
    } else if (pressure > 80) {
        emotion = 'Anxious';
        risk = 'High';
    } else if (retry > 3) {
        emotion = 'Frustrated';
        risk = 'High';
    } else if (duration > 3000 && pressure < 40) {
        emotion = 'Tired / Low Energy';
        risk = 'Medium';
    } else if (duration < 800 && pressure < 50 && retry === 0) {
        emotion = 'Confident / Calm';
        risk = 'Low';
    } else if (speed === 'fast' && retry === 0) {
        emotion = 'Efficient';
        risk = 'Low';
    } else if (speed === 'slow' && retry > 1) {
        emotion = 'Unsure';
        risk = 'Medium';
    }
    
    return { emotion, risk };
}

// ============= GET SUGGESTION (POWER & FRIENDLY) =============
function getSuggestion(emotion) {
    const suggestions = {
        'Stress': {
            short: 'Take a deep breath. You\'ve got this.',
            long: 'I can sense you\'re feeling stressed right now. That\'s okay. Take a moment to breathe deeply. You\'ve handled tough situations before, and you can handle this too.'
        },
        'Anxious': {
            short: 'Pause. Breathe. You are safe.',
            long: 'It seems like you\'re feeling a bit anxious. That\'s completely normal. Try to pause, take a slow breath, and remind yourself — you are safe and you are capable.'
        },
        'Frustrated': {
            short: 'Step back. You can solve this.',
            long: 'I notice some frustration in your energy. That\'s understandable. Step back for a moment, take three deep breaths, and remember — you don\'t have to solve everything all at once.'
        },
        'Tired / Low Energy': {
            short: 'Rest. You deserve a break.',
            long: 'You sound tired, and that\'s okay. Your body is asking for rest. Take a short break, drink some water, and give yourself permission to recharge.'
        },
        'Confident / Calm': {
            short: 'You are in your zone. Keep going!',
            long: 'You\'re in a great state right now — calm, confident, and focused. This is your moment. Use this energy to tackle whatever comes next.'
        },
        'Efficient': {
            short: 'Flow state detected. Use it wisely.',
            long: 'You\'re in flow mode — sharp, fast, and focused. This is your peak performance state. Make the most of it while it lasts.'
        },
        'Unsure': {
            short: 'Slow down. Clarity will come.',
            long: 'It feels like you\'re unsure about something right now. That\'s okay. You don\'t need all the answers today. Slow down, and trust yourself to figure it out.'
        },
        'Neutral': {
            short: 'Balanced and steady. Keep it up.',
            long: 'You seem balanced and steady today — not too high, not too low. That\'s a good place to be. Stay grounded and keep moving forward.'
        }
    };
    
    return suggestions[emotion] || {
        short: 'You are doing great. Keep going.',
        long: 'You\'re doing well. Stay mindful of your breathing and keep moving forward with confidence.'
    };
}

// ============= START SERVER =============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at:`);
    console.log(`   ➜ Local:   http://localhost:${PORT}`);
    console.log(`   ➜ Phone:   http://${localIP}:${PORT}`);
    console.log(`📱 Share the phone link with judges!`);
});