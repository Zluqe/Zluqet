// =====================================
// Blocks IP addresses in a paste and redacts them
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const net = require('net');

function scanForIPs(text) {
  text = typeof text === 'string' ? text : String(text);
  return Array.from(new Set(
    text
      .split(/\s+/)
      .map(tok => tok.replace(/(^[^A-Fa-f0-9:.]+)|([^A-Fa-f0-9:.]+$)/g, ''))
      .filter(tok => net.isIP(tok))
  ));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redactIPs(text) {
  let result = text;
  for (const ip of scanForIPs(text)) {
    const re = new RegExp(
      `(?<![A-Fa-f0-9:.])${escapeRegex(ip)}(?![A-Fa-f0-9:.])`,
      'g'
    );
    result = result.replace(re, '[REDACTED IP]');
  }
  return result;
}

module.exports = { scanForIPs, redactIPs };