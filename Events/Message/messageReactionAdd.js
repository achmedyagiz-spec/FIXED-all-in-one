client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});

    const message = reaction.message;

    const embed = message.embeds?.[0];
    if (!embed || embed.title !== "Soru") return;

    const allReactions = message.reactions.cache;

      for (const [emoji, react] of allReactions) {
      if (react.emoji.name !== reaction.emoji.name) {
        const reactedUsers = await react.users.fetch();
        if (reactedUsers.has(user.id)) {
          await react.users.remove(user.id).catch(() => {});
        }
      }
    }

  } catch (err) {
    console.error("🔴 [ANKET] Emoji kaldırılırken hata:", err);
  }
});