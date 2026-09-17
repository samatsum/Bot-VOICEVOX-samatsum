import type { Command, MessageCommand } from '../types.js';
import { accessCommand } from './access.js';
import { cancelCommand } from './cancel.js';
import { creditsCommand } from './credits.js';
import { dictionaryCommand } from './dictionary.js';
import { joinCommand } from './join.js';
import { leaveCommand } from './leave.js';
import { pingCommand } from './ping.js';
import { playTestCommand } from './play-test.js';
import { queueCommand } from './queue.js';
import { readCommand } from './read.js';
import { readingCommand } from './reading.js';
import { readMessageCommand } from './read-message.js';
import { skipCommand } from './skip.js';
import { settingsCommand } from './settings.js';
import { statusCommand } from './status.js';
import { speakCommand } from './speak.js';
import { voiceCommand } from './voice.js';

export const commands: readonly Command[] = [
  pingCommand, joinCommand, leaveCommand, playTestCommand, readingCommand, skipCommand,
  queueCommand, cancelCommand, voiceCommand, readCommand, speakCommand, dictionaryCommand,
  settingsCommand, statusCommand, accessCommand, creditsCommand
];
export const messageCommands: readonly MessageCommand[] = [readMessageCommand];
export const commandMap = new Map(commands.map((command)=>[command.data.name,command] as const));
export const messageCommandMap = new Map(messageCommands.map((command)=>[command.data.name,command] as const));
