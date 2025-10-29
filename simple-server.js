const express = require('express');
const app = express();
const PORT = 3003;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/translate', (req, res) => {
  res.json({ 
    translation: '测试翻译',
    original: req.body.text,
    targetLanguage: req.body.targetLanguage || 'mandarin'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});