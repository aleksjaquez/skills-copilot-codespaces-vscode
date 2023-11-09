// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const axios = require('axios');
// Create express app
const app = express();
// Parse request body as JSON
app.use(bodyParser.json());
// Store comments
const commentsByPostId = {};
// Get comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});
// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get content of comment
  const { content } = req.body;
  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];
  // Add new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });
  // Store comments
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });
  // Send response
  res.status(201).send(comments);
});
// Handle event from event bus
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);
  const { type, data } = req.body;
  // Check type of event
  if (type === 'CommentModerated') {
    // Get comments for post
    const comments = commentsByPostId[data.postId];
    // Get comment with id from event
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });
    // Update comment
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status,
      },
    });
  }
  // Send response
  res.send({});
});
// Listen on port 400