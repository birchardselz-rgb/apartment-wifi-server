// api/index.js — Vercel Serverless 入口
// Vercel 会自动将本文件作为 /api/* 路由的 handler

const app = require('../backend/server');

// 初始化数据库连接
const db = require('../backend/db');

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  try {
    await db.seedIfEmpty();
    initialized = true;
    console.log('✓ 数据库初始化完成');
  } catch (err) {
    console.error('✗ 数据库初始化失败:', err.message);
  }
}

// Vercel Serverless handler
module.exports = async (req, res) => {
  await ensureInit();
  return app(req, res);
};
