import type { AutocompleteInteraction, ChatInputCommandInteraction, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction, SlashCommandBuilder } from 'discord.js';
export interface Command { data: SlashCommandBuilder; execute(interaction: ChatInputCommandInteraction): Promise<void>; autocomplete?(interaction:AutocompleteInteraction):Promise<void>; }
export interface MessageCommand { data: ContextMenuCommandBuilder; execute(interaction: MessageContextMenuCommandInteraction): Promise<void>; }
