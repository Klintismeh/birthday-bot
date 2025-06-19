// ✅ Birthday Verification Bot with Console Debug, Recovery & Auto-Restart
const {
  Client,
  GatewayIntentBits,
  Partials,
  Routes,
  SlashCommandBuilder,
  REST,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { config } = require("dotenv");
const readline = require("readline");
const chalk = require("chalk");
const express = require("express");
config();

// Discord Client Setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

// Console: .env Check
console.log(chalk.bgBlackBright.magenta("✅ .env loaded:"), {
  TOKEN: process.env.TOKEN ? "✅ Present" : "❌ Missing",
  CLIENT_ID: process.env.CLIENT_ID ? "✅ Present" : "❌ Missing",
  GUILD_ID: process.env.GUILD_ID ? "✅ Present" : "❌ Missing",
});

// When Bot is Ready
client.once("ready", () => {
  console.log(chalk.bgBlackBright.magenta(`🤖 Logged in as ${client.user.tag}`));
  startDevConsole();
  // Keep-Alive Server for Replit/Railway
  const app = express();
  const port = 3000;
  app.get("/", (req, res) => res.send("✅ Bot is online"));
  app.listen(port, () =>
    console.log(chalk.bgBlackBright.magenta(`🌐 Express server listening on port ${port}`))
  );
});

// Slash Command Registration
const commands = [
  new SlashCommandBuilder()
    .setName("verifybirthday")
    .setDescription("Start birthday verification process")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(chalk.bgBlackBright.magenta("📨 Registering slash command..."));
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(chalk.bgBlackBright.magenta("✅ Slash command registered."));
  } catch (error) {
    console.error(chalk.red("❌ Failed to register commands:"), error);
  }
})();

// Slash Command Logic
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "verifybirthday") {
      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("🎂 Birthday Verification")
        .setDescription("Click the button below to input your birthdate.")
        .setColor("Blurple");

      const button = new ButtonBuilder()
        .setCustomId("openModal")
        .setLabel("Enter Birthdate")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);
      await interaction.editReply({ embeds: [embed], components: [row] });
    }

    if (interaction.isButton() && interaction.customId === "openModal") {
      const modal = new ModalBuilder()
        .setCustomId("ageModal")
        .setTitle("Enter Your Birthdate");

      const input = new TextInputBuilder()
        .setCustomId("birthdate")
        .setLabel("Enter your birthday (DD-MM-YYYY)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. 15-06-2005")
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "ageModal") {
      await interaction.deferReply();

      const rawDate = interaction.fields.getTextInputValue("birthdate");
      const [day, month, year] = rawDate.split("-").map(Number);
      const birthDate = new Date(year, month - 1, day);

      if (isNaN(birthDate)) {
        return await interaction.editReply({
          content: "❌ Invalid date format. Use DD-MM-YYYY.",
        });
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

      const member = interaction.member;
      const guild = interaction.guild;
      const roleAdult = guild.roles.cache.find((role) => role.name === "18+");
      const roleMinor = guild.roles.cache.find((role) => role.name === "NOT VERIFIED");

      if (!roleAdult || !roleMinor) {
        return interaction.editReply({
          content: "❌ Required roles not found in the server.",
        });
      }

      let assignedRole;
      if (age >= 18) {
        await member.roles.add(roleAdult);
        assignedRole = roleAdult.name;
      } else {
        await member.roles.add(roleMinor);
        assignedRole = roleMinor.name;
      }

      const formattedDate = `${day.toString().padStart(2, "0")}-${month
        .toString()
        .padStart(2, "0")}-${year}`;
      const response = `🎉 ${member.user.tag} was born on **${formattedDate}** (${age}); role **${assignedRole}** has been assigned.`;
      await interaction.editReply({ content: response });
    }
  } catch (err) {
    console.error(chalk.red("❌ Interaction error:"), err);
    if (interaction.deferred)
      await interaction.editReply({
        content: "❌ An unexpected error occurred.",
      });
    else
      await interaction.reply({
        content: "❌ An unexpected error occurred.",
        ephemeral: true,
      });
  }
});

// Dev Console (type `status`, `fix`, `restart`, `help`)
function startDevConsole() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.magenta("[BOT CONSOLE] > "),
  });
  rl.prompt();

  rl.on("line", async (line) => {
    const command = line.trim().toLowerCase();

    switch (command) {
      case "status":
        console.log(chalk.magenta("📡 Bot is running and healthy."));
        break;
      case "fix":
        console.log(chalk.yellow("🔧 Running fix script... (placeholder)"));
        break;
      case "restart":
        console.log(
          chalk.red(
            "♻️ Restart command issued (manual restart required if not using PM2)."
          )
        );
        process.exit(0);
        break;
      case "help":
        console.log(
          chalk.cyan("Available commands: status, fix, restart, help")
        );
        break;
      default:
        console.log(chalk.gray('Unknown command. Type "help" for options.'));
    }

    rl.prompt();
  });
}

client.login(process.env.TOKEN);
