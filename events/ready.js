const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const StatusManager = require('../utils/statusManager');
const killSwitch = require('../utils/killSwitch');

module.exports = {
    once: true,
    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guilds`);
        
        setInterval(() => {
            if (client.statusManager) {
                logger.info('Running scheduled status check');
                client.statusManager.checkAndRecoverStatus();
            }
        }, 30 * 60 * 1000); 

        setInterval(() => {
            logger.info(`Heartbeat check: Bot is connected to ${client.guilds.cache.size} guilds`);
        }, 60 * 60 * 1000);

        try {
            killSwitch.applyInitialState();
            client.statusManager = new StatusManager(client);

            if (!killSwitch.isKilled()) { 
                client.statusManager.setDefaultStatus();
            }

            logger.logToDiscord(client, `Bot is online and serving in ${client.guilds.cache.size} guilds`);

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
            
            const slashCommands = Array.from(client.slashCommands.values())
                .map(cmd => cmd.slashCommand.toJSON());
            
            if (slashCommands.length > 0) {
                logger.info(`Started refreshing ${slashCommands.length} application (/) commands.`);
                
                const data = await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: slashCommands },
                );
                
                logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
            }
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    },
};