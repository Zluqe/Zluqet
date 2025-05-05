// =====================================
// Format Date
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

module.exports = function formatDate(dt) {
  const options = {
    month:  'short',
    day:    '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false
  };
  return new Date(dt)
    .toLocaleString('en-US', options)
    .replace(',', '');
};