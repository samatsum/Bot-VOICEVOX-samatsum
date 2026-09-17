import { REST, Routes } from 'discord.js';
import { commands, messageCommands } from './commands/index.js';
import { env } from './env.js';

const rest = new REST({ version: '10' }).setToken(env.discordBotToken);
const body = [...commands.map((command)=>command.data.toJSON()), ...messageCommands.map((command)=>command.data.toJSON())];
console.log(`Deploying ${body.length} guild application command(s)...`);
await rest.put(Routes.applicationGuildCommands(env.discordApplicationId, env.discordGuildId), { body });
console.log('Guild application commands deployed successfully.');
