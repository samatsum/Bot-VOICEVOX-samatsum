import type { Message } from 'discord.js';

export type QueueMessageStatus =
  | 'none'
  | 'waiting'
  | 'playing'
  | 'rejected'
  | 'failed';

const STATUS_EMOJI: Record<Exclude<QueueMessageStatus, 'none'>, string> = {
  waiting: '⏳',
  playing: '🔊',
  rejected: '🚫',
  failed: '⚠️'
};

const ALL_STATUS_EMOJI = Object.values(STATUS_EMOJI);

async function removeOwnReaction(message: Message<true>, emoji: string): Promise<void> {
  try {
    const reaction = message.reactions.cache.get(emoji);
    const botId = message.client.user?.id;
    if (reaction && botId) {
      await reaction.users.remove(botId);
    }
  } catch {
    // リアクション権限や履歴参照権限が不足していても読み上げ本体は止めない。
  }
}

export function createMessageStatusController(message: Message<true>): {
  set(status: QueueMessageStatus): Promise<void>;
} {
  let chain: Promise<void> = Promise.resolve();

  return {
    set(status) {
      chain = chain.then(async () => {
        for (const emoji of ALL_STATUS_EMOJI) {
          await removeOwnReaction(message, emoji);
        }

        if (status === 'none') {
          return;
        }

        try {
          await message.react(STATUS_EMOJI[status]);
        } catch {
          // Add Reactions権限がなくてもTTS処理は続行する。
        }
      });

      return chain;
    }
  };
}
