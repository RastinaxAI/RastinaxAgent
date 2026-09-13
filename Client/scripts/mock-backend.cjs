/**
 * Mock Rastinax backend (Django contract, API guide v2).
 * - POST /api/v1/chat/        -> raw text/plain stream + ID headers
 * - GET  /api/v1/conversations/ -> JSON list for visitor
 * - GET  /api/v1/conversations/{id}/ -> JSON detail with messages
 */
const http = require('http');
const crypto = require('crypto');

const PORT = 8001;
const conversations = new Map(); // id -> {id, title, visitor_id, messages: [{id, role, content, created_at}]}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers':
      'X-Conversation-ID, X-Visitor-ID, X-User-Message-ID',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Expose-Headers':
        'X-Conversation-ID, X-Visitor-ID, X-User-Message-ID',
    });
    return res.end();
  }

  // ---------- Chat (streaming) ----------
  if (req.method === 'POST' && url.pathname === '/api/v1/chat/') {
    const body = await readBody(req);
    const message = (body.message || '').trim();
    if (!message) {
      return json(res, 400, { error: 'Message is required.' });
    }

    let conversation = body.conversation_id
      ? conversations.get(body.conversation_id)
      : undefined;

    if (body.conversation_id && !conversation) {
      return json(res, 404, { error: 'Conversation not found.' });
    }

    if (conversation && conversation.visitor_id !== body.visitor_id) {
      return json(res, 403, { error: 'Invalid visitor.' });
    }

    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        title: message.slice(0, 100),
        visitor_id: body.visitor_id || crypto.randomUUID(),
        messages: [],
      };
      conversations.set(conversation.id, conversation);
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    conversation.messages.push(userMessage);

    console.log(
      `[chat] conversation=${conversation.id} visitor=${conversation.visitor_id} message="${message.slice(0, 60)}"`
    );

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Conversation-ID': conversation.id,
      'X-Visitor-ID': conversation.visitor_id,
      'X-User-Message-ID': userMessage.id,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers':
        'X-Conversation-ID, X-Visitor-ID, X-User-Message-ID',
    });

    const answer =
      `این پاسخ آزمایشی برای «${message}» است.\n\n` +
      'پاراگراف اول برای بررسی **streaming** ارسال می‌شود و باید بلافاصله در حباب پیام نمایش داده شود.\n\n' +
      '- مورد اول لیست\n- مورد دوم لیست\n\n' +
      'و جمله پایانی که پس از آن استریم کامل می‌شود.';
    const chunks = answer.match(/[\s\S]{1,40}/g) || [];
    let i = 0;
    let assistantText = '';

    const timer = setInterval(() => {
      if (i >= chunks.length) {
        clearInterval(timer);
        conversation.messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: assistantText,
          created_at: new Date().toISOString(),
        });
        console.log(`[chat] stream finished (${assistantText.length} chars)`);
        return res.end();
      }
      const chunk = chunks[i++];
      assistantText += chunk;
      res.write(chunk);
    }, 120);

    // If the client aborts, close without saving (matches Django behavior).
    req.on('close', () => {
      if (i < chunks.length) {
        clearInterval(timer);
        console.log('[chat] client aborted stream; assistant message NOT saved');
      }
    });
    return;
  }

  // ---------- Conversation list ----------
  if (req.method === 'GET' && url.pathname === '/api/v1/conversations/') {
    const visitorId = url.searchParams.get('visitor_id');
    if (!visitorId) {
      return json(res, 400, { error: 'visitor_id is required.' });
    }
    const list = [...conversations.values()]
      .filter((conversation) => conversation.visitor_id === visitorId)
      .sort((a, b) =>
        (b.messages.at(-1)?.created_at || '').localeCompare(
          a.messages.at(-1)?.created_at || ''
        )
      )
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        last_message: conversation.messages.at(-1)
          ? {
              role: conversation.messages.at(-1).role,
              content: conversation.messages.at(-1).content,
              created_at: conversation.messages.at(-1).created_at,
            }
          : null,
        message_count: conversation.messages.length,
        created_at: conversation.messages[0]?.created_at || new Date().toISOString(),
        updated_at: conversation.messages.at(-1)?.created_at || new Date().toISOString(),
      }));
    console.log(`[list] visitor=${visitorId} -> ${list.length} conversations`);
    return json(res, 200, list);
  }

  // ---------- Conversation detail ----------
  const detailMatch = url.pathname.match(
    /^\/api\/v1\/conversations\/([^/]+)\/$/
  );
  if (req.method === 'GET' && detailMatch) {
    const conversation = conversations.get(detailMatch[1]);
    const visitorId = url.searchParams.get('visitor_id');
    if (!visitorId) {
      return json(res, 400, { error: 'visitor_id is required.' });
    }
    if (!conversation || conversation.visitor_id !== visitorId) {
      return json(res, 404, { error: 'Conversation not found.' });
    }
    console.log(`[detail] conversation=${conversation.id}`);
    return json(res, 200, {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.messages[0]?.created_at || new Date().toISOString(),
      updated_at: conversation.messages.at(-1)?.created_at || new Date().toISOString(),
      messages: conversation.messages,
    });
  }

  json(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock backend listening on http://127.0.0.1:${PORT}`);
});
