import dotenv from 'dotenv';

console.log('Loading environment variables...');
dotenv.config();

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');

console.log('Environment test complete.');