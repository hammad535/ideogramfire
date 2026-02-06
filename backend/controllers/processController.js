const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const FormData = require('form-data');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;

// GPT API Configuration
const MAX_TOKENS_PER_REQUEST = parseInt(process.env.MAX_TOKENS_PER_REQUEST || '3000', 10);
const MAX_TOTAL_TOKENS = parseInt(process.env.MAX_TOTAL_TOKENS || '4000', 10); // Max total (prompt + completion)

// Read system prompt from file based on creative mode
function getSystemPrompt(creativeMode) {
  try {
    const safeMode = (creativeMode || 'paid').toLowerCase();
    const promptFileName = safeMode === 'organic'
      ? 'marketingOrganicPrompt.txt'
      : 'marketingPaidPrompt.txt';
    const promptPath = path.join(__dirname, `../../prompts/${promptFileName}`);
    const systemPrompt = fs.readFileSync(promptPath, 'utf8').trim();
    // Append strict JSON format instruction
    return systemPrompt + '\n\nCRITICAL: You MUST respond with STRICT JSON ONLY. No markdown, no explanations, no extra text.\n\nRequired format (exactly):\n{\n  "prompts": [\n    "prompt 1",\n    "prompt 2",\n    ...\n    "prompt 20"\n  ]\n}\n\nReturn exactly 20 prompts in the "prompts" array. Nothing else.';
  } catch (err) {
    console.error('Error reading system prompt file, using fallback:', err.message);
    // Fallback prompt with all requirements (paid ads default)
    return 'You are a senior performance marketer specializing in compliant, high-converting ad creative. Generate image ad prompts that: convert effectively, follow ad platform best practices (Facebook, Instagram, Google Ads), match the given demographic, avoid AI artifacts, look human-made, and maintain diversity. CRITICAL: Avoid exaggerated claims, ensure realistic compliant copy, enforce platform compliance, and maintain distinct diversity across all 20 variations. Generate exactly 20 distinct, compliant, diverse variations.\n\nCRITICAL: You MUST respond with STRICT JSON ONLY. No markdown, no explanations, no extra text.\n\nRequired format (exactly):\n{\n  "prompts": [\n    "prompt 1",\n    "prompt 2",\n    ...\n    "prompt 20"\n  ]\n}\n\nReturn exactly 20 prompts in the "prompts" array. Nothing else.';
  }
}

// Helper: call OpenAI Chat Completions API for 20 marketing prompts
async function callOpenAI(imageBuffer, imageMimetype, prompt, creativeMode) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] ========== GPT REQUEST START ==========`);
  console.log(`[${timestamp}] GPT Request Details:`);
  console.log(`[${timestamp}]   - Model: gpt-4.1`);
  console.log(`[${timestamp}]   - Image MIME Type: ${imageMimetype}`);
  console.log(`[${timestamp}]   - Image Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`[${timestamp}]   - Image Base64 Length: ${imageBuffer.toString('base64').length} chars`);
  console.log(`[${timestamp}]   - User Prompt Length: ${prompt.length} chars`);
  console.log(`[${timestamp}]   - Max Tokens (Completion): ${MAX_TOKENS_PER_REQUEST}`);
  console.log(`[${timestamp}]   - Max Total Tokens (Limit): ${MAX_TOTAL_TOKENS}`);
  console.log(`[${timestamp}]   - Temperature: 0.7`);
  console.log(`[${timestamp}]   - Top P: 1`);
  console.log(`[${timestamp}]   - Presence Penalty: 0`);
  console.log(`[${timestamp}]   - Frequency Penalty: 0`);
  
  const imageBase64 = imageBuffer.toString('base64');
  const systemPrompt = getSystemPrompt(creativeMode);
  console.log(`[${timestamp}]   - Creative Mode: ${creativeMode}`);
  console.log(`[${timestamp}]   - System Prompt Length: ${systemPrompt.length} chars`);
  
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${imageMimetype};base64,${imageBase64}` } }
      ]
    }
  ];
  
  console.log(`[${timestamp}] Sending request to OpenAI API...`);
  const requestBody = {
      model: 'gpt-4.1',
      messages,
      max_tokens: MAX_TOKENS_PER_REQUEST,
      temperature: .7,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      response_format: { type: 'json_object' }  // Force JSON output
    };
  
  console.log(`[${timestamp}] Request body (without messages):`, {
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    max_total_tokens_limit: MAX_TOTAL_TOKENS,
    temperature: requestBody.temperature,
    response_format: requestBody.response_format
  });
  
  let response;
  try {
    response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] ========== GPT API ERROR ==========`);
    
    // Handle quota exceeded errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      console.error(`[${errorTimestamp}] API Error Status: ${status}`);
      console.error(`[${errorTimestamp}] API Error Data:`, JSON.stringify(errorData, null, 2));
      
      if (status === 429) {
        // Rate limit or quota exceeded
        const errorMessage = errorData?.error?.message || 'Rate limit or quota exceeded';
        console.error(`[${errorTimestamp}] QUOTA/RATE LIMIT EXCEEDED:`, errorMessage);
        throw new Error(`OpenAI API quota exceeded. ${errorMessage}. Please check your API usage limits and billing.`);
      } else if (status === 401) {
        console.error(`[${errorTimestamp}] AUTHENTICATION ERROR: Invalid API key`);
        throw new Error('OpenAI API authentication failed. Please check your API key configuration.');
      } else if (status === 402) {
        console.error(`[${errorTimestamp}] PAYMENT REQUIRED: Insufficient credits`);
        throw new Error('OpenAI API payment required. Your account has insufficient credits. Please add payment method or credits.');
      } else if (status === 500 || status === 503) {
        console.error(`[${errorTimestamp}] OPENAI SERVER ERROR: Service unavailable`);
        throw new Error('OpenAI API service is temporarily unavailable. Please try again later.');
      } else {
        console.error(`[${errorTimestamp}] UNKNOWN API ERROR:`, errorData);
        throw new Error(`OpenAI API error: ${errorData?.error?.message || 'Unknown error occurred'}`);
      }
    } else if (error.request) {
      console.error(`[${errorTimestamp}] NETWORK ERROR: No response received`);
      throw new Error('Network error: Could not reach OpenAI API. Please check your internet connection.');
    } else {
      console.error(`[${errorTimestamp}] REQUEST SETUP ERROR:`, error.message);
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const responseTimestamp = new Date().toISOString();
  
  console.log(`[${responseTimestamp}] ========== GPT RESPONSE RECEIVED ==========`);
  console.log(`[${responseTimestamp}] GPT Response Details:`);
  console.log(`[${responseTimestamp}]   - Status: ${response.status} ${response.statusText}`);
  console.log(`[${responseTimestamp}]   - Response Time: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log(`[${responseTimestamp}]   - Model Used: ${response.data.model || 'N/A'}`);
  
  // Enhanced token usage logging
  const usage = response.data.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || 0;
  
  console.log(`[${responseTimestamp}] ========== TOKEN USAGE PER GENERATION ==========`);
  console.log(`[${responseTimestamp}]   - Prompt Tokens: ${promptTokens}`);
  console.log(`[${responseTimestamp}]   - Completion Tokens: ${completionTokens}`);
  console.log(`[${responseTimestamp}]   - Total Tokens: ${totalTokens}`);
  console.log(`[${responseTimestamp}]   - Token Usage: ${((totalTokens / MAX_TOTAL_TOKENS) * 100).toFixed(1)}% of limit (${totalTokens}/${MAX_TOTAL_TOKENS})`);
  
  // Check if token usage exceeds limits
  if (totalTokens > MAX_TOTAL_TOKENS) {
    console.warn(`[${responseTimestamp}] ⚠️ WARNING: Total tokens (${totalTokens}) exceeded limit (${MAX_TOTAL_TOKENS})`);
  }
  if (completionTokens > MAX_TOKENS_PER_REQUEST) {
    console.warn(`[${responseTimestamp}] ⚠️ WARNING: Completion tokens (${completionTokens}) exceeded max_tokens setting (${MAX_TOKENS_PER_REQUEST})`);
  }
  
  // Estimate cost (approximate, varies by model)
  const estimatedCost = (totalTokens / 1000) * 0.03; // Rough estimate for GPT-4
  console.log(`[${responseTimestamp}]   - Estimated Cost: ~$${estimatedCost.toFixed(4)} (approximate)`);
  console.log(`[${responseTimestamp}] ===========================================`);
  
  console.log(`[${responseTimestamp}]   - Finish Reason: ${response.data.choices?.[0]?.finish_reason || 'N/A'}`);
  
  // Check finish reason for token limit issues
  const finishReason = response.data.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    console.warn(`[${responseTimestamp}] ⚠️ WARNING: Response was truncated due to max_tokens limit. Consider increasing MAX_TOKENS_PER_REQUEST.`);
  }
  
  let rawContent = response.data.choices[0].message.content;
  const rawContentLength = rawContent.length;
  console.log(`[${responseTimestamp}]   - Raw Response Length: ${rawContentLength} chars`);
  
  // Log truncated raw response (safe - first 500 chars, last 200 chars)
  const truncatedPreview = rawContentLength > 700 
    ? rawContent.substring(0, 500) + '...[TRUNCATED]...' + rawContent.substring(rawContentLength - 200)
    : rawContent;
  console.log(`[${responseTimestamp}] Raw OpenAI response (truncated for safety):`);
  console.log(`[${responseTimestamp}] ${truncatedPreview}`);
  
  // Remove Markdown code block if present (handle various markdown formats)
  const originalContent = rawContent;
  const hadMarkdownBlock = rawContent.trim().startsWith('```');
  if (hadMarkdownBlock) {
    console.log(`[${responseTimestamp}] Detected Markdown code block wrapper, removing...`);
    rawContent = rawContent.replace(/^```[a-zA-Z]*\n?/m, '').replace(/\n?```$/m, '').trim();
    console.log(`[${responseTimestamp}] Markdown wrapper removed. New length: ${rawContent.length} chars`);
  }
  
  // Remove any leading/trailing whitespace
  rawContent = rawContent.trim();
  
  let parsedData;
  let prompts;
  
  try {
    // Parse JSON
    parsedData = JSON.parse(rawContent);
    console.log(`[${responseTimestamp}] Successfully parsed JSON response`);
    console.log(`[${responseTimestamp}]   - Parsed data type: ${Array.isArray(parsedData) ? 'Array' : typeof parsedData}`);
    console.log(`[${responseTimestamp}]   - Parsed data keys: ${typeof parsedData === 'object' && !Array.isArray(parsedData) ? Object.keys(parsedData).join(', ') : 'N/A'}`);
    
    // Handle both formats: direct array or object with "prompts" key
    if (Array.isArray(parsedData)) {
      console.log(`[${responseTimestamp}] Response is a direct array`);
      prompts = parsedData;
    } else if (parsedData && typeof parsedData === 'object' && parsedData.prompts) {
      console.log(`[${responseTimestamp}] Response is an object with "prompts" key`);
      prompts = parsedData.prompts;
    } else {
      throw new Error(`Invalid response format. Expected array or object with "prompts" key, got ${typeof parsedData}`);
    }
    
    // Validate prompts array
    if (!Array.isArray(prompts)) {
      throw new Error(`Prompts is not an array. Got type: ${typeof prompts}`);
    }
    
    console.log(`[${responseTimestamp}]   - Number of prompts: ${prompts.length}`);
    
    // Strict validation: must be exactly 20 prompts
    if (prompts.length < 20) {
      console.error(`[${responseTimestamp}] ERROR: Expected exactly 20 prompts, got ${prompts.length}`);
      throw new Error(`Expected exactly 20 prompts, but received ${prompts.length} prompts.`);
    }
    
    if (prompts.length > 20) {
      console.warn(`[${responseTimestamp}] WARNING: Received ${prompts.length} prompts, expected 20. Taking first 20.`);
      prompts = prompts.slice(0, 20);
    }
    
    // Validate all prompts are strings
    const invalidPrompts = prompts.filter(p => typeof p !== 'string' || !p.trim());
    if (invalidPrompts.length > 0) {
      throw new Error(`Found ${invalidPrompts.length} invalid prompts (not strings or empty)`);
    }
    
    console.log(`[${responseTimestamp}] ✓ All prompts are valid (exactly 20 total)`);
    console.log(`[${responseTimestamp}] Sample prompts (first 3):`);
    prompts.slice(0, 3).forEach((p, idx) => {
      console.log(`[${responseTimestamp}]   ${idx + 1}. ${p.substring(0, 80)}${p.length > 80 ? '...' : ''}`);
    });
    
  } catch (e) {
    console.error(`[${responseTimestamp}] ========== GPT PARSE ERROR ==========`);
    console.error(`[${responseTimestamp}] Parse Error Type: ${e.constructor.name}`);
    console.error(`[${responseTimestamp}] Parse Error Message: ${e.message}`);
    console.error(`[${responseTimestamp}] Parse Error Stack: ${e.stack}`);
    console.error(`[${responseTimestamp}] Original raw content length: ${originalContent.length} chars`);
    console.error(`[${responseTimestamp}] Processed content length: ${rawContent.length} chars`);
    console.error(`[${responseTimestamp}] Processed content (first 1000 chars): ${rawContent.substring(0, 1000)}`);
    if (rawContent.length > 1000) {
      console.error(`[${responseTimestamp}] Processed content (last 500 chars): ...${rawContent.substring(rawContent.length - 500)}`);
    }
    throw new Error(`Failed to parse 20 prompts from OpenAI response: ${e.message}`);
  }
  
  console.log(`[${responseTimestamp}] ========== GPT REQUEST COMPLETE ==========`);
  return prompts;
}

// Helper: call Ideogram Generate-V3 API for a single prompt
async function callIdeogram(prompt, promptIndex = null) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const promptLabel = promptIndex !== null ? `Prompt #${promptIndex + 1}` : 'Single Prompt';
  
  console.log(`[${timestamp}] ========== IDEOGRAM REQUEST START [${promptLabel}] ==========`);
  console.log(`[${timestamp}] Ideogram Request Details:`);
  console.log(`[${timestamp}]   - Endpoint: https://api.ideogram.ai/v1/ideogram-v3/generate`);
  console.log(`[${timestamp}]   - Prompt Length: ${prompt.length} chars`);
  console.log(`[${timestamp}]   - Prompt Preview: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  console.log(`[${timestamp}]   - Rendering Speed: TURBO`);
  console.log(`[${timestamp}]   - Magic Prompt: ON`);
  
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('rendering_speed', 'TURBO');
  form.append('magic_prompt', 'ON');
  
  console.log(`[${timestamp}] Sending request to Ideogram API...`);
  const response = await axios.post(
    'https://api.ideogram.ai/v1/ideogram-v3/generate',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Api-Key': IDEOGRAM_API_KEY,
      },
      maxBodyLength: Infinity,
    }
  );
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const responseTimestamp = new Date().toISOString();
  
  console.log(`[${responseTimestamp}] ========== IDEOGRAM RESPONSE RECEIVED [${promptLabel}] ==========`);
  console.log(`[${responseTimestamp}] Ideogram Response Details:`);
  console.log(`[${responseTimestamp}]   - Status: ${response.status} ${response.statusText}`);
  console.log(`[${responseTimestamp}]   - Response Time: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  
  const imageData = response.data.data || [];
  const imageUrls = imageData.map(img => img.url);
  
  console.log(`[${responseTimestamp}]   - Images Generated: ${imageUrls.length}`);
  if (imageUrls.length > 0) {
    console.log(`[${responseTimestamp}]   - Image URLs:`);
    imageUrls.forEach((url, idx) => {
      console.log(`[${responseTimestamp}]     ${idx + 1}. ${url}`);
    });
  } else {
    console.warn(`[${responseTimestamp}]   - WARNING: No images returned in response`);
    console.log(`[${responseTimestamp}]   - Response Data Structure:`, JSON.stringify(response.data, null, 2).substring(0, 500));
  }
  
  console.log(`[${responseTimestamp}] ========== IDEOGRAM REQUEST COMPLETE [${promptLabel}] ==========`);
  return imageUrls;
}

// Controller
exports.processImageAndPrompt = async (req, res) => {
  const requestStartTime = Date.now();
  const requestTimestamp = new Date().toISOString();
  
  console.log(`[${requestTimestamp}] ========== PROCESS REQUEST START ==========`);
  console.log(`[${requestTimestamp}] Request Details:`, {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'] ? `${(parseInt(req.headers['content-length']) / 1024).toFixed(2)} KB` : 'N/A'
  });
  
  try {
    if (!OPENAI_API_KEY || !IDEOGRAM_API_KEY) {
      console.error(`[${requestTimestamp}] API keys validation failed`);
      console.error(`[${requestTimestamp}]   - OPENAI_API_KEY: ${OPENAI_API_KEY ? 'Present' : 'Missing'}`);
      console.error(`[${requestTimestamp}]   - IDEOGRAM_API_KEY: ${IDEOGRAM_API_KEY ? 'Present' : 'Missing'}`);
      return res.status(500).json({ error: 'API keys not configured on server.' });
    }
    
    if (!req.file) {
      console.warn(`[${requestTimestamp}] Validation failed: No image file in request`);
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    
    console.log(`[${requestTimestamp}] Image file received:`, {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      bufferSize: `${(req.file.buffer.length / 1024).toFixed(2)} KB`
    });
    
    let prompt = req.body.prompt || '';
    const promptBeforeSanitize = prompt;
    prompt = sanitizeHtml(prompt, { allowedTags: [], allowedAttributes: {} }).trim();
    
    if (promptBeforeSanitize !== prompt) {
      console.log(`[${requestTimestamp}] Prompt sanitized:`, {
        beforeLength: promptBeforeSanitize.length,
        afterLength: prompt.length,
        removed: promptBeforeSanitize.length - prompt.length
      });
    }
    
    if (!prompt) {
      console.warn(`[${requestTimestamp}] Validation failed: Prompt is empty after sanitization`);
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    
    // Determine creative mode (default to paid for backwards compatibility)
    const creativeModeRaw = (req.body.creativeMode || 'paid').toString().toLowerCase();
    const creativeMode = creativeModeRaw === 'organic' ? 'organic' : 'paid';
    if (creativeModeRaw !== creativeMode) {
      console.warn(`[${requestTimestamp}] Unknown creative mode "${creativeModeRaw}". Defaulting to "paid".`);
    }
    console.log(`[${requestTimestamp}] Creative mode selected: ${creativeMode}`);

    console.log(`[${requestTimestamp}] Prompt validated:`, {
      length: prompt.length,
      preview: prompt.substring(0, 150) + '...'
    });
    
    // Call OpenAI for 20 prompts
    let prompts;
    try {
      console.log(`[${requestTimestamp}] Initiating GPT request to generate 20 prompts...`);
      prompts = await callOpenAI(req.file.buffer, req.file.mimetype, prompt, creativeMode);
      console.log(`[${requestTimestamp}] GPT request completed successfully. Received ${prompts.length} prompts.`);
    } catch (err) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] ========== GPT REQUEST ERROR ==========`);
      console.error(`[${errorTimestamp}] Error from OpenAI API:`, err?.response?.data || err.message);
      console.error(`[${errorTimestamp}] Error Stack:`, err.stack);
      if (err.response) {
        console.error(`[${errorTimestamp}]   - Response Status: ${err.response.status}`);
        console.error(`[${errorTimestamp}]   - Response Headers:`, err.response.headers);
      }
      
      // Determine appropriate HTTP status code based on error type
      let statusCode = 502; // Bad Gateway (default for API errors)
      let errorMessage = err.message || 'Error from OpenAI API.';
      
      // Check if it's a quota/rate limit error
      if (err.message && (err.message.includes('quota') || err.message.includes('rate limit') || err.message.includes('payment required'))) {
        statusCode = 429; // Too Many Requests
      } else if (err.response?.status === 401) {
        statusCode = 401; // Unauthorized
      } else if (err.response?.status === 402) {
        statusCode = 402; // Payment Required
      } else if (err.response?.status === 429) {
        statusCode = 429; // Too Many Requests
      }
      
      return res.status(statusCode).json({ 
        error: errorMessage,
        details: err?.response?.data || err.message,
        type: err.response?.status === 429 ? 'quota_exceeded' : 'api_error'
      });
    }
    // Call Ideogram for each prompt (in parallel)
    let images = [];
    const imageGenStartTime = Date.now();
    const imageGenTimestamp = new Date().toISOString();
    
    console.log(`[${imageGenTimestamp}] ========== IMAGE GENERATION START ==========`);
    console.log(`[${imageGenTimestamp}] Image Generation Details:`);
    console.log(`[${imageGenTimestamp}]   - Total Prompts to Process: ${prompts.length}`);
    console.log(`[${imageGenTimestamp}]   - Processing Mode: Parallel (all requests sent simultaneously)`);
    console.log(`[${imageGenTimestamp}]   - Starting parallel Ideogram API calls...`);
    
    try {
      const ideogramStartTime = Date.now();
      const results = await Promise.all(
        prompts.map((p, idx) => {
          console.log(`[${new Date().toISOString()}] Queuing Ideogram request for prompt ${idx + 1}/${prompts.length}`);
          return callIdeogram(p, idx);
        })
      );
      const ideogramEndTime = Date.now();
      const ideogramDuration = ideogramEndTime - ideogramStartTime;
      
      console.log(`[${new Date().toISOString()}] All Ideogram requests completed`);
      console.log(`[${new Date().toISOString()}]   - Total Time for All Requests: ${ideogramDuration}ms (${(ideogramDuration / 1000).toFixed(2)}s)`);
      console.log(`[${new Date().toISOString()}]   - Average Time per Request: ${(ideogramDuration / prompts.length).toFixed(0)}ms`);
      console.log(`[${new Date().toISOString()}]   - Results Array Length: ${results.length}`);
      
      images = results.flat();
      console.log(`[${new Date().toISOString()}] Flattened images array`);
      console.log(`[${new Date().toISOString()}]   - Total Images Generated: ${images.length}`);
      console.log(`[${new Date().toISOString()}]   - Images per Prompt (avg): ${(images.length / prompts.length).toFixed(2)}`);
    } catch (err) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] ========== IMAGE GENERATION ERROR ==========`);
      console.error(`[${errorTimestamp}] Error from Ideogram API:`, err?.response?.data || err.message);
      console.error(`[${errorTimestamp}] Error Stack:`, err.stack);
      if (err.response) {
        console.error(`[${errorTimestamp}]   - Response Status: ${err.response.status}`);
        console.error(`[${errorTimestamp}]   - Response Data:`, JSON.stringify(err.response.data, null, 2));
      }
      return res.status(502).json({ error: 'Error from Ideogram API.', details: err?.response?.data || err.message });
    }
    
    const imageGenEndTime = Date.now();
    const imageGenDuration = imageGenEndTime - imageGenStartTime;
    const finalTimestamp = new Date().toISOString();
    
    console.log(`[${finalTimestamp}] ========== IMAGE GENERATION COMPLETE ==========`);
    console.log(`[${finalTimestamp}] Final Summary:`);
    console.log(`[${finalTimestamp}]   - Total Generation Time: ${imageGenDuration}ms (${(imageGenDuration / 1000).toFixed(2)}s)`);
    console.log(`[${finalTimestamp}]   - Prompts Processed: ${prompts.length}`);
    console.log(`[${finalTimestamp}]   - Images Generated: ${images.length}`);
    const requestEndTime = Date.now();
    const totalRequestDuration = requestEndTime - requestStartTime;
    
    console.log(`[${finalTimestamp}] ========== PROCESS REQUEST COMPLETE ==========`);
    console.log(`[${finalTimestamp}] Final Request Summary:`, {
      totalDuration: `${totalRequestDuration}ms (${(totalRequestDuration / 1000).toFixed(2)}s)`,
      promptsGenerated: prompts.length,
      imagesGenerated: images.length,
      success: true
    });
    const route = req.originalUrl?.split('?')[0] || req.path || '/api/process';
    console.log(`[${finalTimestamp}] Successfully processed request user_id=${req.user?.id} route=${route}. Returning ${images.length} images.`);
    
    res.json({ images, prompts });
  } catch (err) {
    const errorTimestamp = new Date().toISOString();
    const requestDuration = Date.now() - requestStartTime;
    const requestId = req.id || `req-${Date.now()}`;
    // Log full error server-side only; never send stack or details to client
    console.error(`[${errorTimestamp}] ========== PROCESS REQUEST ERROR ========== request_id=${requestId}`);
    console.error(`[${errorTimestamp}] Internal server error:`, err.message);
    console.error(`[${errorTimestamp}] Error Stack:`, err.stack);
    console.error(`[${errorTimestamp}] Request Duration: ${requestDuration}ms`);
    res.status(500).json({ error: 'Internal server error.', request_id: requestId });
  }
};

// Helper: Strip all metadata from image (EXIF, AI tags, etc.)
async function stripImageMetadata(imageBuffer) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Stripping metadata from image...`);
  
  try {
    // Use sharp to strip all metadata
    // withMetadata(false) removes all EXIF, IPTC, XMP, and other metadata
    const cleanedBuffer = await sharp(imageBuffer)
      .withMetadata(false)  // Remove all metadata
      .toBuffer();
    
    console.log(`[${timestamp}] Metadata stripped:`, {
      originalSize: `${(imageBuffer.length / 1024).toFixed(2)} KB`,
      cleanedSize: `${(cleanedBuffer.length / 1024).toFixed(2)} KB`
    });
    
    return cleanedBuffer;
  } catch (err) {
    console.error(`[${timestamp}] Error stripping metadata:`, err.message);
    // If metadata stripping fails, return original buffer
    // This ensures downloads still work even if sharp fails
    return imageBuffer;
  }
}

// Controller: Serve cleaned image (metadata stripped)
exports.serveCleanedImage = async (req, res) => {
  const timestamp = new Date().toISOString();
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    const requestId = req.id || `req-${Date.now()}`;
    return res.status(400).json({ error: 'Image URL parameter required.', request_id: requestId });
  }
  
  console.log(`[${timestamp}] ========== SERVING CLEANED IMAGE ==========`);
  console.log(`[${timestamp}] Image URL: ${imageUrl.substring(0, 80)}...`);
  
  try {
    // Fetch original image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const originalBuffer = Buffer.from(response.data);
    
    console.log(`[${timestamp}] Original image fetched: ${(originalBuffer.length / 1024).toFixed(2)} KB`);
    
    // Strip metadata
    const cleanedBuffer = await stripImageMetadata(originalBuffer);
    
    // Determine content type and extension
    const ext = imageUrl.split('.').pop().split('?')[0].toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    
    console.log(`[${timestamp}] Serving cleaned image: ${contentType}, ${(cleanedBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`[${timestamp}] ========== CLEANED IMAGE SERVED ==========`);
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="image.${ext}"`,
      'Cache-Control': 'no-cache'
    });
    res.send(cleanedBuffer);
  } catch (err) {
    const requestId = req.id || `req-${Date.now()}`;
    console.error(`[${timestamp}] Error serving cleaned image request_id=${requestId}:`, err.message);
    res.status(500).json({ error: 'Failed to process image.', request_id: requestId });
  }
};

// Controller: Export images as zip from URLs (with metadata stripped)
exports.exportZipFromUrls = async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ========== ZIP EXPORT START ==========`);
  
  try {
    const urls = req.body.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No image URLs provided.' });
    }
    
    console.log(`[${timestamp}] Exporting ${urls.length} images with metadata stripped...`);
    
    const zip = new JSZip();
    const folder = zip.folder('ideogramfire-images');
    
    await Promise.all(urls.map(async (url, idx) => {
      try {
        const imageTimestamp = new Date().toISOString();
        console.log(`[${imageTimestamp}] Processing image ${idx + 1}/${urls.length}...`);
        
        // Fetch original image
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const originalBuffer = Buffer.from(response.data);
        
        console.log(`[${imageTimestamp}] Image ${idx + 1} fetched: ${(originalBuffer.length / 1024).toFixed(2)} KB`);
        
        // Strip metadata
        const cleanedBuffer = await stripImageMetadata(originalBuffer);
        
        const ext = url.split('.').pop().split('?')[0];
        folder.file(`image_${idx + 1}.${ext}`, cleanedBuffer);
        
        console.log(`[${imageTimestamp}] Image ${idx + 1} metadata stripped and added to ZIP`);
      } catch (e) {
        console.error(`[${new Date().toISOString()}] Failed to process image ${idx + 1}:`, e.message);
        // skip failed downloads
      }
    }));
    
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    
    console.log(`[${timestamp}] ZIP generated: ${(content.length / 1024).toFixed(2)} KB`);
    console.log(`[${timestamp}] ========== ZIP EXPORT COMPLETE ==========`);
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="ideogramfire-images.zip"',
    });
    res.send(content);
  } catch (err) {
    const requestId = req.id || `req-${Date.now()}`;
    console.error(`[${new Date().toISOString()}] Error exporting zip request_id=${requestId}:`, err.message);
    res.status(500).json({ error: 'Failed to export zip.', request_id: requestId });
  }
}; 