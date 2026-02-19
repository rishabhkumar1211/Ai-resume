// Vercel serverless function to proxy Groq API requests
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    console.log('Proxy called - environment check:', {
      hasKey: !!groqApiKey,
      method: req.method,
      url: req.url
    });
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY missing from environment');
      res.status(500).json({ 
        error: 'API key not configured',
        debug: 'Environment variable GROQ_API_KEY is missing'
      });
      return;
    }
    
    console.log('Making request to Groq API:', {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      hasAuth: !!groqApiKey,
      bodyPreview: JSON.stringify(req.body).substring(0, 200) + '...'
    });
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
