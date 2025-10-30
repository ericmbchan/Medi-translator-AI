import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import textToSpeech from '@google-cloud/text-to-speech';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment validation
const requiredEnvVars = ['OPENAI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName] === 'your_openai_api_key_here');

// Demo mode for testing without API keys
const DEMO_MODE = missingEnvVars.length > 0;

if (DEMO_MODE) {
  console.log('🧪 Running in DEMO MODE - using mock responses');
  console.log('⚠️ Missing API keys:', missingEnvVars.join(', '));
  console.log('💡 To use real translations, add your OpenAI API key and Google credentials');
} else {
  console.log('✅ Environment variables validated');
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize OpenAI with error handling
let openai;
if (!DEMO_MODE) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error.message);
    process.exit(1);
  }
} else {
  console.log('🧪 OpenAI client skipped (demo mode)');
}

// Initialize Google Cloud TTS client with error handling
let ttsClient;
if (!DEMO_MODE) {
  try {
    ttsClient = new textToSpeech.TextToSpeechClient();
    console.log('✅ Google Cloud TTS client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud TTS client:', error.message);
    console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account file');
    process.exit(1);
  }
} else {
  console.log('🧪 Google Cloud TTS client skipped (demo mode)');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Medical Translator API is running' });
});

// List available voices endpoint
app.get('/api/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    const cantonesesVoices = result.voices.filter(voice => 
      voice.languageCodes.some(code => code.startsWith('zh-HK'))
    );
    res.json({ voices: cantonesesVoices });
  } catch (error) {
    console.error('Error listing voices:', error);
    res.status(500).json({ error: 'Failed to list voices', details: error.message });
  }
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'mandarin', currentSpeaker = 'doctor' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Valid text is required',
        details: 'Please provide non-empty text to translate'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({ 
        error: 'Text too long',
        details: 'Please limit input to 2000 characters or less'
      });
    }

    if (!['mandarin', 'cantonese'].includes(targetLanguage)) {
      return res.status(400).json({
        error: 'Invalid target language',
        details: 'Supported languages: mandarin, cantonese'
      });
    }

    // Determine translation direction based on speaker
    const translationDirection = currentSpeaker === 'doctor' ? 'to_chinese' : 'to_english';
    
    console.log(`Translation request (${currentSpeaker} -> ${translationDirection}, ${targetLanguage}): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    // Demo mode - return mock translations
    if (DEMO_MODE) {
      let translation;
      
      if (translationDirection === 'to_chinese') {
        // Doctor speaking English -> translate to Chinese
        const mockTranslations = {
          mandarin: {
            'hello': '你好',
            'hi': '您好',
            'how are you': '您好吗？',
            'how are you feeling': '您感觉怎么样？',
            'what is your name': '您叫什么名字？',
            'how do you feel': '您感觉怎么样？',
            'where does it hurt': '哪里疼？',
            'where is the pain': '疼痛在哪里？',
            'can you tell me where the pain is': '您能告诉我疼痛在哪里吗？',
            'what kind of pain': '什么样的疼痛？',
            'when did this start': '这是什么时候开始的？',
            'when did this pain start': '这个疼痛是什么时候开始的？',
            'how long have you had this': '您有这个症状多长时间了？',
            'on a scale of 1 to 10': '从1到10分',
            'take this medication': '服用这个药物',
            'take this medication twice daily': '每天服用这个药物两次',
            'take this medication twice daily with food': '每天随餐服用这个药物两次',
            'with food': '随餐服用',
            'before meals': '饭前服用',
            'after meals': '饭后服用',
            'thank you': '谢谢',
            'goodbye': '再见',
            'please sit down': '请坐',
            'open your mouth': '请张开嘴',
            'take a deep breath': '请深呼吸'
          },
          cantonese: {
            'hello': '你好',
            'hi': '你好',
            'how are you': '你好嗎？',
            'how are you feeling': '你感覺點樣？',
            'what is your name': '你叫咩名？',
            'how do you feel': '你覺得點樣？',
            'where does it hurt': '邊度痛？',
            'where is the pain': '痛喺邊度？',
            'can you tell me where the pain is': '你可以話我知痛喺邊度嗎？',
            'what kind of pain': '咩種痛？',
            'when did this start': '幾時開始嘅？',
            'when did this pain start': '呢個痛幾時開始嘅？',
            'how long have you had this': '你有呢個症狀幾耐？',
            'on a scale of 1 to 10': '由1到10分',
            'take this medication': '食呢隻藥',
            'take this medication twice daily': '呢隻藥一日食兩次',
            'take this medication twice daily with food': '呢隻藥要一日食兩次，記住要同食物一齊食',
            'with food': '同食物一齊食',
            'before meals': '飯前食',
            'after meals': '飯後食',
            'thank you': '多謝',
            'goodbye': '再見',
            'please sit down': '請坐',
            'open your mouth': '請張開口',
            'take a deep breath': '請深呼吸'
          }
        };

        // Try exact match first
        const lowerText = text.toLowerCase().trim();
        translation = mockTranslations[targetLanguage][lowerText];
        
        // Try partial matches with word boundaries to avoid false matches
        if (!translation) {
          // Sort phrases by length (longest first) to prioritize longer matches
          const sortedPhrases = Object.entries(mockTranslations[targetLanguage])
            .sort(([a], [b]) => b.length - a.length);
            
          for (const [englishPhrase, chinesePhrase] of sortedPhrases) {
            // Use word boundaries to avoid partial word matches like "hi" in "this"
            const regex = new RegExp(`\\b${englishPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(lowerText)) {
              translation = chinesePhrase;
              console.log(`Matched phrase: "${englishPhrase}" in "${lowerText}"`);
              break;
            }
          }
        }
        
        // Fallback translation without demo mode prefix
        if (!translation) {
          console.log(`No match found for: "${lowerText}"`);
          translation = targetLanguage === 'mandarin' 
            ? `${text}（请提供更详细的翻译）` 
            : `${text}（請提供更詳細嘅翻譯）`;
        }
      } else {
        // Patient speaking Chinese -> translate to English
        const mockChineseToEnglish = {
          // Basic greetings and responses
          '你好': 'Hello',
          '我很好': 'I am fine',
          '我不舒服': 'I don\'t feel well',
          '我不好': 'I am not well',
          '我病了': 'I am sick',
          '我感觉不好': 'I don\'t feel good',
          
          // Body parts and location
          '这里疼': 'It hurts here',
          '那里疼': 'It hurts there',
          '头疼': 'I have a headache',
          '头痛': 'I have a headache',
          '偏头痛': 'I have a migraine',
          '肚子疼': 'My stomach hurts',
          '胃疼': 'My stomach hurts',
          '肚子痛': 'My stomach hurts',
          '喉咙疼': 'My throat hurts',
          '嗓子疼': 'My throat hurts',
          '扁桃体发炎': 'My tonsils are inflamed',
          '背疼': 'My back hurts',
          '腰疼': 'My lower back hurts',
          '脖子疼': 'My neck hurts',
          '肩膀疼': 'My shoulder hurts',
          '胸疼': 'My chest hurts',
          '胸口疼': 'My chest hurts',
          '心脏疼': 'My heart hurts',
          '膝盖疼': 'My knee hurts',
          '腿疼': 'My leg hurts',
          '脚疼': 'My foot hurts',
          '手疼': 'My hand hurts',
          '胳膊疼': 'My arm hurts',
          '眼睛疼': 'My eyes hurt',
          '耳朵疼': 'My ear hurts',
          '牙疼': 'I have a toothache',
          '牙痛': 'I have a toothache',
          
          // Common symptoms
          '发烧': 'I have a fever',
          '发热': 'I have a fever',
          '高烧': 'I have a high fever',
          '低烧': 'I have a low fever',
          '咳嗽': 'I am coughing',
          '干咳': 'I have a dry cough',
          '咳痰': 'I am coughing up phlegm',
          '流鼻涕': 'I have a runny nose',
          '鼻塞': 'My nose is blocked',
          '打喷嚏': 'I am sneezing',
          '感冒': 'I have a cold',
          '感冒了': 'I have a cold',
          '流感': 'I have the flu',
          '恶心': 'I feel nauseous',
          '想吐': 'I feel like vomiting',
          '呕吐': 'I am vomiting',
          '拉肚子': 'I have diarrhea',
          '腹泻': 'I have diarrhea',
          '便秘': 'I am constipated',
          '头晕': 'I feel dizzy',
          '头昏': 'I feel dizzy',
          '晕': 'I feel dizzy',
          '疲倦': 'I feel tired',
          '累': 'I am tired',
          '乏力': 'I feel weak',
          '没力气': 'I have no energy',
          '失眠': 'I have insomnia',
          '睡不着': 'Can\'t sleep',
          '睡不好': 'Can\'t sleep well',
          '食欲不振': 'Loss of appetite',
          '吃不下': 'Can\'t eat',
          '没胃口': 'No appetite',
          '心跳快': 'Fast heartbeat',
          '心慌': 'Heart palpitations',
          '气短': 'Shortness of breath',
          '呼吸困难': 'Difficulty breathing',
          '过敏': 'I am allergic',
          '过敏反应': 'Allergic reaction',
          '皮疹': 'I have a rash',
          '发痒': 'It\'s itchy',
          '痒': 'It\'s itchy',
          '红肿': 'Red and swollen',
          '肿胀': 'Swelling',
          
          // Pain descriptions
          '疼': 'It hurts',
          '痛': 'It\'s painful',
          '很疼': 'It hurts a lot',
          '非常疼': 'It hurts very much',
          '剧痛': 'Severe pain',
          '隐痛': 'Dull pain',
          '有点疼': 'It hurts a little',
          '一直疼': 'It hurts all the time',
          '有时候疼': 'It hurts sometimes',
          '刺痛': 'Sharp pain',
          '针扎一样疼': 'Like needle pricks',
          '闷痛': 'Dull pain',
          '胀痛': 'Bloating pain',
          '酸痛': 'Aching pain',
          '隐隐作痛': 'Dull aching',
          '一阵一阵的疼': 'Comes and goes',
          '越来越疼': 'Getting worse',
          '没那么疼了': 'Not as painful now',
          '疼得厉害': 'Very painful',
          '火辣辣的疼': 'Burning pain',
          '麻木': 'Numbness',
          '发麻': 'Tingling',
          '僵硬': 'Stiffness',
          '发紧': 'Tightness',
          '很疼': 'It hurts a lot',
          '有点疼': 'It hurts a little',
          '一直疼': 'It hurts all the time',
          '有时候疼': 'It hurts sometimes',
          '刺痛': 'Sharp pain',
          '闷痛': 'Dull pain',
          '胀痛': 'Bloating pain',
          '酸痛': 'Aching pain',
          '隐隐作痛': 'Dull aching',
          '一阵一阵的疼': 'Comes and goes',
          '越来越疼': 'Getting worse',
          '没那么疼了': 'Not as painful now',
          '睡不着': 'Can\'t sleep',
          '吃不下': 'Can\'t eat',
          '没胃口': 'No appetite',
          '从昨天开始': 'Since yesterday',
          '从今天早上开始': 'Since this morning',
          '两天了': 'For two days',
          '一个星期了': 'For a week',
          '一个月了': 'For a month',
          '大概一个月': 'About a month',
          '大概一個月': 'About a month',
          '几天了': 'For a few days',
          '很久了': 'For a long time',
          '刚开始': 'Just started',
          '昨天': 'Yesterday',
          '今天': 'Today',
          '上周': 'Last week',
          '上个月': 'Last month',
          '一周': 'One week',
          '两周': 'Two weeks',
          '三天': 'Three days',
          '五天': 'Five days',
          '十天': 'Ten days',
          '半个月': 'Half a month',
          '两个月': 'Two months',
          '很多年了': 'For many years',
          
          // Medical history and responses (Mandarin)
          '以前有过': 'I had it before',
          '第一次': 'First time',
          '家族史': 'Family history',
          '遗传': 'Hereditary',
          '高血压': 'High blood pressure',
          '糖尿病': 'Diabetes',
          '心脏病': 'Heart disease',
          '哮喘': 'Asthma',
          '过敏史': 'Allergy history',
          '药物过敏': 'Drug allergy',
          '食物过敏': 'Food allergy',
          '怀孕': 'Pregnant',
          '怀孕了': 'I am pregnant',
          '月经': 'Menstruation',
          '生理期': 'Menstrual period',
          '吃药': 'Taking medication',
          '正在吃药': 'Currently taking medication',
          '没吃药': 'Not taking medication',
          '按时吃药': 'Taking medication on time',
          '忘记吃药': 'Forgot to take medication',
          '手术': 'Surgery',
          '做过手术': 'Had surgery',
          '住院': 'Hospitalized',
          '住过院': 'Was hospitalized',
          '体检': 'Physical examination',
          '检查': 'Examination',
          '化验': 'Lab test',
          '拍片': 'X-ray',
          'CT': 'CT scan',
          'B超': 'Ultrasound',
          '谢谢': 'Thank you',
          '再见': 'Goodbye',
          '是的': 'Yes',
          '不是': 'No',
          '我不知道': 'I don\'t know',
          
          // Basic greetings and responses (Cantonese)
          '我好好': 'I am fine',
          '我唔舒服': 'I don\'t feel well',
          '我唔好': 'I am not well',
          '我病咗': 'I am sick',
          '我感覺唔好': 'I don\'t feel good',
          
          // Body parts and location (Cantonese)
          '呢度痛': 'It hurts here',
          '嗰度痛': 'It hurts there',
          '頭痛': 'I have a headache',
          '頭疼': 'I have a headache',
          '偏頭痛': 'I have a migraine',
          '肚痛': 'My stomach hurts',
          '胃痛': 'My stomach hurts',
          '肚仔痛': 'My stomach hurts',
          '喉嚨痛': 'My throat hurts',
          '扁桃腺發炎': 'My tonsils are inflamed',
          '背脊痛': 'My back hurts',
          '腰痛': 'My lower back hurts',
          '頸痛': 'My neck hurts',
          '膊頭痛': 'My shoulder hurts',
          '胸口痛': 'My chest hurts',
          '心口痛': 'My chest hurts',
          '心臟痛': 'My heart hurts',
          '膝頭痛': 'My knee hurts',
          '腳痛': 'My leg hurts',
          '腳板痛': 'My foot hurts',
          '手痛': 'My hand hurts',
          '手臂痛': 'My arm hurts',
          '眼痛': 'My eyes hurt',
          '耳仔痛': 'My ear hurts',
          '牙痛': 'I have a toothache',
          '牙齒痛': 'I have a toothache',
          
          // Common symptoms (Cantonese)
          '發燒': 'I have a fever',
          '發熱': 'I have a fever',
          '高燒': 'I have a high fever',
          '低燒': 'I have a low fever',
          '咳': 'I am coughing',
          '咳嗽': 'I am coughing',
          '乾咳': 'I have a dry cough',
          '咳痰': 'I am coughing up phlegm',
          '流鼻水': 'I have a runny nose',
          '鼻塞': 'My nose is blocked',
          '打乞嗤': 'I am sneezing',
          '感冒': 'I have a cold',
          '感冒咗': 'I have a cold',
          '流感': 'I have the flu',
          '想嘔': 'I feel nauseous',
          '想吐': 'I feel like vomiting',
          '嘔吐': 'I am vomiting',
          '肚瀉': 'I have diarrhea',
          '腹瀉': 'I have diarrhea',
          '便秘': 'I am constipated',
          '頭暈': 'I feel dizzy',
          '頭昏': 'I feel dizzy',
          '暈': 'I feel dizzy',
          '攰': 'I am tired',
          '好攰': 'I am very tired',
          '冇力': 'I feel weak',
          '冇氣力': 'I have no energy',
          '失眠': 'I have insomnia',
          '瞓唔著': 'Can\'t sleep',
          '瞓唔好': 'Can\'t sleep well',
          '冇胃口': 'Loss of appetite',
          '食唔落': 'Can\'t eat',
          '冇食慾': 'No appetite',
          '心跳快': 'Fast heartbeat',
          '心慌': 'Heart palpitations',
          '氣促': 'Shortness of breath',
          '呼吸困難': 'Difficulty breathing',
          '過敏': 'I am allergic',
          '過敏反應': 'Allergic reaction',
          '皮疹': 'I have a rash',
          '痕癢': 'It\'s itchy',
          '痕': 'It\'s itchy',
          '紅腫': 'Red and swollen',
          '腫脹': 'Swelling',
          
          // Pain descriptions (Cantonese)
          '痛': 'It hurts',
          '好痛': 'It hurts a lot',
          '非常痛': 'It hurts very much',
          '劇痛': 'Severe pain',
          '隱痛': 'Dull pain',
          '有啲痛': 'It hurts a little',
          '一直痛': 'It hurts all the time',
          '有時痛': 'It hurts sometimes',
          '刺痛': 'Sharp pain',
          '好似針拮咁痛': 'Like needle pricks',
          '悶痛': 'Dull pain',
          '脹痛': 'Bloating pain',
          '酸痛': 'Aching pain',
          '隱隱作痛': 'Dull aching',
          '一陣一陣咁痛': 'Comes and goes',
          '越嚟越痛': 'Getting worse',
          '冇咁痛喇': 'Not as painful now',
          '痛到好犀利': 'Very painful',
          '火辣辣咁痛': 'Burning pain',
          '麻痺': 'Numbness',
          '發麻': 'Tingling',
          '僵硬': 'Stiffness',
          '發緊': 'Tightness',
          '好痛': 'It hurts a lot',
          '有啲痛': 'It hurts a little',
          '一直痛': 'It hurts all the time',
          '有時痛': 'It hurts sometimes',
          '刺痛': 'Sharp pain',
          '悶痛': 'Dull pain',
          '脹痛': 'Bloating pain',
          '酸痛': 'Aching pain',
          '隱隱作痛': 'Dull aching',
          '一陣一陣咁痛': 'Comes and goes',
          '越嚟越痛': 'Getting worse',
          '冇咁痛喇': 'Not as painful now',
          '瞓唔著': 'Can\'t sleep',
          '食唔落': 'Can\'t eat',
          '冇胃口': 'No appetite',
          '從琴日開始': 'Since yesterday',
          '從今朝開始': 'Since this morning',
          '兩日喇': 'For two days',
          '一個禮拜喇': 'For a week',
          '一個月喇': 'For a month',
          '大概一個月': 'About a month',
          '幾日喇': 'For a few days',
          '好耐喇': 'For a long time',
          '啱啱開始': 'Just started',
          '琴日': 'Yesterday',
          '今日': 'Today',
          '上星期': 'Last week',
          '上個月': 'Last month',
          '一星期': 'One week',
          '兩星期': 'Two weeks',
          '三日': 'Three days',
          '五日': 'Five days',
          '十日': 'Ten days',
          '半個月': 'Half a month',
          '兩個月': 'Two months',
          '好多年喇': 'For many years',
          
          // Medical history and responses (Cantonese)
          '以前有過': 'I had it before',
          '第一次': 'First time',
          '家族史': 'Family history',
          '遺傳': 'Hereditary',
          '高血壓': 'High blood pressure',
          '糖尿病': 'Diabetes',
          '心臟病': 'Heart disease',
          '哮喘': 'Asthma',
          '過敏史': 'Allergy history',
          '藥物過敏': 'Drug allergy',
          '食物過敏': 'Food allergy',
          '懷孕': 'Pregnant',
          '懷孕咗': 'I am pregnant',
          '嚟M': 'Menstruation',
          '生理期': 'Menstrual period',
          '食藥': 'Taking medication',
          '而家食緊藥': 'Currently taking medication',
          '冇食藥': 'Not taking medication',
          '準時食藥': 'Taking medication on time',
          '唔記得食藥': 'Forgot to take medication',
          '手術': 'Surgery',
          '做過手術': 'Had surgery',
          '住院': 'Hospitalized',
          '住過院': 'Was hospitalized',
          '身體檢查': 'Physical examination',
          '檢查': 'Examination',
          '化驗': 'Lab test',
          '照X光': 'X-ray',
          'CT': 'CT scan',
          'B超': 'Ultrasound',
          '多謝': 'Thank you',
          '再見': 'Goodbye',
          '係': 'Yes',
          '唔係': 'No',
          '我唔知': 'I don\'t know',
          '唔舒服': 'Not feeling well',
          '好辛苦': 'Very uncomfortable',
          
          // Common partial words that might appear in patient responses
          '儿歌喉痛': 'My throat hurts', // Keep this existing one
        };

        // Try exact match first
        translation = mockChineseToEnglish[text.trim()];
        
        // Try partial matches with word boundaries and sorted by length
        if (!translation) {
          // Sort by length (longest first) to prioritize longer matches
          const sortedPhrases = Object.entries(mockChineseToEnglish)
            .sort(([a], [b]) => b.length - a.length);
          
          for (const [chinesePhrase, englishPhrase] of sortedPhrases) {
            // Check if the Chinese text contains the phrase
            if (text.includes(chinesePhrase)) {
              translation = englishPhrase;
              console.log(`Matched Chinese phrase: "${chinesePhrase}" in "${text}"`);
              break;
            }
          }
        }
        
        // Fallback translation for Chinese to English
        if (!translation) {
          console.log(`No Chinese match found for: "${text}"`);
          translation = `"${text}" (Please provide proper English translation)`;
        }
      }

      console.log(`Translation completed (${translationDirection}): "${translation}"`);
      
      return res.json({
        translation: translation,
        originalText: text,
        targetLanguage: targetLanguage,
        translationDirection: translationDirection,
        demoMode: true
      });
    }
    const systemPrompts = {
      mandarin: `You are an expert medical interpreter specializing in doctor-patient communication. Your role is to translate what a doctor says in English into natural, clear, and culturally appropriate Simplified Chinese (Mandarin) that Chinese patients can easily understand.

CONTEXT: The input will be dialogue from a doctor speaking to a Chinese patient. Your translation should:

1. ACCURACY: Maintain all medical information precisely - no omissions or additions
2. CLARITY: Use simple, clear Mandarin that patients of all education levels can understand
3. CULTURAL SENSITIVITY: Adapt to mainland Chinese cultural context while preserving medical meaning
4. NATURAL TONE: Sound like how a Mandarin-speaking doctor would naturally speak to a patient
5. RESPECTFUL: Use appropriate levels of politeness and formality for healthcare settings

MEDICAL TERMINOLOGY: 
- Use commonly understood Mandarin medical terms
- When technical terms are necessary, include simple explanations
- Prioritize patient comprehension over literal translation

OUTPUT FORMAT: Simplified Chinese characters only, no explanations or notes.

Examples of good Mandarin translations:
Doctor: "Take this medication twice daily with food."
Translation: "这个药一天吃两次，记得要和食物一起服用。"

Doctor: "You have a mild fever, please rest and drink plenty of fluids."
Translation: "您有点低烧，请多休息，记得要多喝水。"`,

      cantonese: `You are an expert medical interpreter specializing in doctor-patient communication. Your role is to translate what a doctor says in English into natural, authentic Cantonese that Hong Kong patients can easily understand.

CONTEXT: The input will be dialogue from a doctor speaking to a Cantonese-speaking patient. Your translation should:

1. ACCURACY: Maintain all medical information precisely - no omissions or additions
2. AUTHENTICITY: Use genuine Hong Kong Cantonese expressions and colloquialisms
3. CULTURAL SENSITIVITY: Adapt to Hong Kong cultural context while preserving medical meaning
4. NATURAL TONE: Sound like how a Cantonese-speaking doctor would naturally speak to a patient in Hong Kong
5. RESPECTFUL: Use appropriate Cantonese honorifics and politeness levels

CANTONESE CHARACTERISTICS:
- Use Traditional Chinese characters (繁體字)
- Include authentic Cantonese particles (啊, 呀, 喇, 㗎, 咩, etc.)
- Use Cantonese-specific vocabulary and sentence structures
- Avoid Mandarin-influenced phrasing

OUTPUT FORMAT: Traditional Chinese characters with Cantonese expressions, no explanations or notes.

Examples of good Cantonese translations:
Doctor: "Take this medication twice daily with food."
Translation: "呢隻藥要一日食兩次，記住要同食物一齊食㗎。"

Doctor: "You have a mild fever, please rest and drink plenty of fluids."
Translation: "您有少少發燒，要多啲休息，記住要飲多啲水啊。"`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompts[targetLanguage]
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent medical translations
      max_tokens: 1000,
    });

    const translation = completion.choices[0].message.content.trim();
    
    console.log(`Translation completed (${targetLanguage}): "${translation.substring(0, 100)}${translation.length > 100 ? '...' : ''}"`);

    res.json({ 
      translation,
      original: text,
      targetLanguage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    // More specific error handling
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ 
        error: 'Translation service temporarily unavailable',
        details: 'Please try again in a moment'
      });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({ 
        error: 'Too many requests',
        details: 'Please wait a moment before trying again'
      });
    }

    res.status(500).json({ 
      error: 'Translation failed', 
      details: 'Unable to process translation request'
    });
  }
});

// Audio generation endpoint
app.post('/api/audio', async (req, res) => {
  try {
    const { text, targetLanguage = 'mandarin' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Valid text is required for audio generation',
        details: 'Please provide non-empty text to convert to speech'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({ 
        error: 'Text too long for audio generation',
        details: 'Please limit text to 1000 characters or less'
      });
    }

    if (!['mandarin', 'cantonese'].includes(targetLanguage)) {
      return res.status(400).json({
        error: 'Invalid target language for audio',
        details: 'Supported languages: mandarin, cantonese'
      });
    }

    console.log(`Audio generation request (${targetLanguage}): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Demo mode - return mock audio response
    if (DEMO_MODE) {
      console.log(`Audio generation skipped (demo mode) - ${targetLanguage}`);
      
      return res.json({
        audio: null,
        message: `Demo mode: Audio would be generated for "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        targetLanguage: targetLanguage,
        demoMode: true
      });
    }
    const enhancedText = `<speak>
      <prosody rate="0.85" pitch="-2st" volume="medium">
        <emphasis level="moderate">${text.trim()}</emphasis>
      </prosody>
      <break time="0.5s"/>
    </speak>`;

    // Voice configurations for different dialects
    const voiceConfigs = {
      mandarin: {
        languageCode: 'zh-CN',
        voiceOptions: [
          { name: 'zh-CN-Neural2-A', type: 'Neural2' },
          { name: 'zh-CN-Wavenet-A', type: 'Wavenet' },
          { name: null, type: 'Standard' }
        ]
      },
      cantonese: {
        languageCode: 'zh-HK',
        voiceOptions: [
          { name: 'zh-HK-Neural2-A', type: 'Neural2' },
          { name: 'zh-HK-HiuMaan', type: 'Premium' },
          { name: 'zh-HK-HiuGaai', type: 'Standard' },
          { name: null, type: 'Basic' }
        ]
      }
    };

    const config = voiceConfigs[targetLanguage];
    let audioGenerated = false;
    let lastError = null;

    // Try voice options in order of preference
    for (const voiceOption of config.voiceOptions) {
      try {
        const request = {
          input: { ssml: enhancedText },
          voice: {
            languageCode: config.languageCode,
            ...(voiceOption.name && { name: voiceOption.name }),
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.85,
            pitch: -2.0,
            volumeGainDb: 1.0,
            sampleRateHertz: 24000,
            effectsProfileId: ['telephony-class-application'],
          },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);

        if (!response.audioContent) {
          throw new Error('No audio content received from TTS service');
        }

        const audioBase64 = response.audioContent.toString('base64');
        
        console.log(`Audio generated successfully with ${voiceOption.type} voice (${targetLanguage}): ${audioBase64.length} bytes`);

        res.json({ 
          audio: audioBase64,
          contentType: 'audio/mp3',
          voiceType: `${voiceOption.type} (${targetLanguage})`,
          language: targetLanguage,
          duration: Math.ceil(text.length / 8),
          timestamp: new Date().toISOString()
        });

        audioGenerated = true;
        break;

      } catch (voiceError) {
        console.log(`${voiceOption.type} voice failed (${targetLanguage}), trying next option:`, voiceError.message);
        lastError = voiceError;
        continue;
      }
    }

    if (!audioGenerated) {
      throw lastError || new Error('All voice options failed');
    }

  } catch (error) {
    console.error('Audio generation error:', error);
    
    // More specific error handling for TTS
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ 
        error: 'Invalid text for audio generation',
        details: 'The text may contain unsupported characters or formatting'
      });
    }
    
    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ 
        error: 'Audio service not available',
        details: 'Text-to-speech service access is not configured'
      });
    }

    if (error.code === 8) { // RESOURCE_EXHAUSTED
      return res.status(429).json({ 
        error: 'Audio service temporarily unavailable',
        details: 'Please try again in a moment'
      });
    }

    res.status(500).json({ 
      error: 'Audio generation failed', 
      details: 'Unable to convert text to speech'
    });
  }
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server with validation
async function startServer() {
  try {
    // Test connections only if not in demo mode
    if (!DEMO_MODE) {
      // Test OpenAI connection
      await openai.models.list();
      console.log('✅ OpenAI API connection verified');

      // Test Google Cloud TTS connection
      await ttsClient.listVoices({ languageCode: 'zh-CN' });
      console.log('✅ Google Cloud TTS connection verified');
    } else {
      console.log('🧪 API connection tests skipped (demo mode)');
    }

    const server = app.listen(PORT, () => {
      console.log('\n🚀 Medical Translator Server Started Successfully!');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`� Translation: POST http://localhost:${PORT}/api/translate`);
      console.log(`🔊 Audio: POST http://localhost:${PORT}/api/audio`);
      console.log(`🏥 Health: GET http://localhost:${PORT}/api/health`);
      console.log(`📋 Voices: GET http://localhost:${PORT}/api/voices`);
      console.log(`\n✨ Ready for doctor-patient translations!\n`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('Please try a different port or stop the conflicting process');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('Please check your API credentials and network connection');
    process.exit(1);
  }
}

startServer();
