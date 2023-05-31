'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

var gptHistorySchema = Schema({
  prompt: String,
  answer: String,
  createdAt: Date,
  type: String,
  userId: { type: ObjectId, ref: 'user' },
});

module.exports = mongoose.model('GPTHistory', gptHistorySchema);