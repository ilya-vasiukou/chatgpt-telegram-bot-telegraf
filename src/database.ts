import { Pool, QueryResult } from 'pg';
import { MyContext, MyMessage, User, Event, UserData } from './types';
import { toLogFormat } from './utils';
import { DATABASE_URL, NO_ANSWER_ERROR } from './config';

if (typeof DATABASE_URL !== 'string') {
  throw new Error('DATABASE_URL is not defined');
}
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export { pool }; 

export const usedTokensForUser = async (user_id: number): Promise<number> => {
  const res = await pool.query('SELECT SUM(usage_total_tokens) FROM events WHERE user_id = $1', [user_id]);
  return res.rows[0].sum || 0;
};

export const selectMessagesByChatIdGPTformat = async (ctx: MyContext) => {
  if (ctx.chat && ctx.chat.id) {
    const res = await pool.query(`
      SELECT role, content 
      FROM messages 
      WHERE chat_id = $1 
        AND is_active = TRUE 
        AND time >= NOW() - INTERVAL '16 hours' 
      ORDER BY id
    `, [ctx.chat.id]);
    console.log(toLogFormat(ctx, `messages received from the database: ${res.rows.length}`));
    return res.rows as MyMessage[];
  } else {
    throw new Error('ctx.chat.id is undefined');
  }
}

export const selectUserByUserId = async (user_id: number) => {
  const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
  return res.rows[0];
}

export const insertMessage = async ({role, content, chat_id, user_id}: MyMessage) => {
  const res = await pool.query(`
    INSERT INTO messages (role, content, chat_id, time, user_id)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, (SELECT id FROM users WHERE user_id = $4))
    RETURNING *;
  `, [role, content, chat_id, user_id]);
  return res.rows[0];
}

export const insertUserOrUpdate = async ({user_id, username, default_language_code, language_code=default_language_code, openai_api_key=null, usage_type=null}: User) => {
  try {
    const res = await pool.query(`
    INSERT INTO users (user_id, username, default_language_code, language_code, openai_api_key, usage_type, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      username = EXCLUDED.username,
      default_language_code = EXCLUDED.default_language_code,
      language_code = EXCLUDED.language_code,
      openai_api_key = COALESCE(EXCLUDED.openai_api_key, users.openai_api_key),
      usage_type = COALESCE(EXCLUDED.usage_type, users.usage_type),
      created_at = COALESCE(users.created_at, EXCLUDED.created_at)
    RETURNING *;
  `, [user_id, username, default_language_code, language_code, openai_api_key, usage_type]);
  return res.rows[0];
  } catch (error) {
    throw error;
  }
}
  
export const insertEvent = async (event: Event) => {
  event.time = new Date();
  try {
    const res = await pool.query(`
      INSERT INTO events (
        time,
        type,
  
        user_id,
        user_is_bot,
        user_language_code,
        user_username,
  
        chat_id,
        chat_type,
  
        message_role,
        messages_type,
        message_voice_duration,
        message_command,
        content_length,
  
        usage_model,
        usage_object,
        usage_completion_tokens,
        usage_prompt_tokens,
        usage_total_tokens,
        api_key
      )
      VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19
      )
      RETURNING *;
    `, [
      event.time,
      event.type,
  
      event.user_id,
      event.user_is_bot,
      event.user_language_code,
      event.user_username,
  
      event.chat_id,
      event.chat_type,
  
      event.message_role,
      event.messages_type,
      event.message_voice_duration,
      event.message_command,
      event.content_length,
  
      event.usage_model,
      event.usage_object,
      event.usage_completion_tokens,
      event.usage_prompt_tokens,
      event.usage_total_tokens,
      event.api_key,
    ]);
    return res.rows[0];
  } catch (error) {
    throw error;
  }
}

export const deleteMessagesByChatId = async (chat_id: number) => {
  const res = await pool.query('DELETE FROM messages WHERE chat_id = $1', [chat_id]);
  return res;
}

export const deactivateMessagesByChatId = async (chat_id: number) => {
  const res = await pool.query('UPDATE messages SET is_active = FALSE WHERE chat_id = $1', [chat_id]);
  return res;
}

export async function saveAnswerToDB(chatResponse: any, ctx: MyContext, userData: UserData) {
  try {
    const answer = chatResponse.choices?.[0]?.message?.content || NO_ANSWER_ERROR;
    if (ctx.chat && ctx.chat.id) {
      insertMessage({
        role: "assistant",
        content: answer,
        chat_id: ctx.chat.id,
        user_id: null,
      });
    } else {
      throw new Error(`ctx.chat.id is undefined`);
    }
    insertEvent({
      type: 'assistant_message',
      user_id: ctx.from?.id || null,
      user_is_bot: ctx.from?.is_bot || null,
      user_language_code: ctx.from?.language_code || null,
      user_username: ctx.from?.username || null,
      chat_id: ctx.chat?.id || null,
      chat_type: ctx.chat?.type || null,
      message_role: "assistant",
      messages_type: "text",
      message_voice_duration: null,
      message_command: null,
      content_length: answer.length,
      usage_model: chatResponse.model || null,
      usage_object: chatResponse.object || null,
      usage_completion_tokens: chatResponse.usage?.completion_tokens || null,
      usage_prompt_tokens: chatResponse.usage?.prompt_tokens || null,
      usage_total_tokens: chatResponse.usage?.total_tokens || null,
      api_key: userData.openai.apiKey || null,
    } as Event);
    console.log(toLogFormat(ctx, `answer saved to the database. total_tokens: ${chatResponse.usage?.total_tokens || null}`));
  } catch (error) {
    console.log(toLogFormat(ctx, `[ERROR] error in saving the answer to the database: ${error}`));
  }
}

export async function saveCommandToDB(ctx: MyContext, command: string) {
  try {
    insertEvent({
      type: 'user_command',
      user_id: ctx.from?.id || null,
      user_is_bot: ctx.from?.is_bot || null,
      user_language_code: ctx.from?.language_code || null,
      user_username: ctx.from?.username || null,
      chat_id: ctx.chat?.id || null,
      chat_type: ctx.chat?.type || null,
      message_role: "user",
      messages_type: "text",
      message_voice_duration: null,
      message_command: command,
      content_length: null,
      usage_model: null,
      usage_object: null,
      usage_completion_tokens: null,
      usage_prompt_tokens: null,
      usage_total_tokens: null,
      api_key: null,
    } as Event);
    console.log(toLogFormat(ctx, `${command} saved to the database`));
  } catch (error) {
    console.log(toLogFormat(ctx, `[ERROR] error in saving the command to the database: ${error}`));
  }
}

// insertEvent Simple with only type, message_role, messages_type and this is it
export async function insertEventSimple(ctx: MyContext, type: string, message_role: string, messages_type: string) {
  try {
    insertEvent({
      type: type,
      user_id: ctx.from?.id || null,
      user_is_bot: ctx.from?.is_bot || null,
      user_language_code: ctx.from?.language_code || null,
      user_username: ctx.from?.username || null,
      chat_id: ctx.chat?.id || null,
      chat_type: ctx.chat?.type || null,
      message_role: message_role,
      messages_type: messages_type,
      message_voice_duration: null,
      message_command: null,
      content_length: null,
      usage_model: null,
      usage_object: null,
      usage_completion_tokens: null,
      usage_prompt_tokens: null,
      usage_total_tokens: null,
      api_key: null,
    } as Event);
    console.log(toLogFormat(ctx, `${message_role} saved to the database`));
  } catch (error) {
    console.log(toLogFormat(ctx, `[ERROR] error in saving the ${message_role} to the database: ${error}`));
  }
}

export async function insertEventViaMessageType(ctx: MyContext, eventType: string, messageType: string, messageContent: string) {
  try {
    insertEvent({
      type: eventType,
      user_id: ctx.from?.id || null,
      user_is_bot: ctx.from?.is_bot || null,
      user_language_code: ctx.from?.language_code || null,
      user_username: ctx.from?.username || null,
      chat_id: ctx.chat?.id || null,
      chat_type: ctx.chat?.type || null,
      message_role: "user",
      messages_type: messageType,
      message_voice_duration: messageType === "voice" ? ctx.message?.voice?.duration : null,
      message_command: null,
      content_length: messageContent.length,
      usage_model: null,
      usage_object: null,
      usage_completion_tokens: null,
      usage_prompt_tokens: null,
      usage_total_tokens: null,
      api_key: null,
    } as Event);
    console.log(toLogFormat(ctx, `${messageType} saved to the database`));
  } catch (error) {
    console.log(toLogFormat(ctx, `[ERROR] error in saving the ${messageType} to the database: ${error}`));
  }
}

export async function insertModelTranscriptionEvent(ctx: MyContext, transcriptionText: string, userData: UserData) {
  try {
    insertEvent({
      type: 'model_transcription',

      user_id: ctx.from?.id || null,
      user_is_bot: ctx.from?.is_bot || null,
      user_language_code: ctx.from?.language_code || null,
      user_username: ctx.from?.username || null,

      chat_id: ctx.chat?.id || null,
      chat_type: ctx.chat?.type || null,

      message_role: null,
      messages_type: null,
      message_voice_duration: null,
      message_command: null,
      content_length: transcriptionText.length,

      usage_model: "whisper-1",
      usage_object: null,
      usage_completion_tokens: null,
      usage_prompt_tokens: null,
      usage_total_tokens: null,
      api_key: userData.openai.apiKey || null,
    } as Event);
    console.log(toLogFormat(ctx, `model_transcription saved to the database`));
  } catch (error) {
    console.log(toLogFormat(ctx, `[ERROR] error in saving the model_transcription to the database: ${error}`));
  }
}