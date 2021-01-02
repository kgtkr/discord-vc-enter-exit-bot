import * as Discord from "discord.js";
import * as fs from "fs";

function findTextChannel({
  guild,
  vcId,
}: {
  guild: Discord.Guild;
  vcId: string;
}): Discord.TextChannel | Discord.NewsChannel {
  return guild.channels.cache
    .map((channel) =>
      channel.isText() && (channel.topic ?? "").includes(`vc:${vcId}`)
        ? channel
        : undefined
    )
    .find((channel) => channel !== undefined)!;
}

function countMember({ vc }: { vc: Discord.VoiceChannel }): number {
  return vc.members.array().filter((member) => !member.user.bot).length;
}

async function sendNotification({
  type,
  guild,
  vc,
  member,
}: {
  type: "入室" | "退室";
  vc: Discord.VoiceChannel;
  guild: Discord.Guild;
  member: Discord.GuildMember;
}) {
  if (!member.user.bot) {
    await findTextChannel({ guild, vcId: vc.id }).send(
      `${(member?.nickname ?? member?.user.username).replace(
        /(?=[!-@])/g,
        "\\"
      )}が${type}しました。(現在${countMember({ vc })}人)`
    );
  }
}

const client = new Discord.Client();

client.on("ready", () => {
  client.on("voiceStateUpdate", async (prevState, state) => {
    try {
      if (state.member === null) {
        return;
      }
      if (
        prevState.channel !== null &&
        state.channel &&
        prevState.channel.id !== state.channel.id
      ) {
        await sendNotification({
          type: "退室",
          guild: state.guild,
          vc: prevState.channel,
          member: state.member,
        });
        await sendNotification({
          type: "入室",
          guild: state.guild,
          vc: state.channel,
          member: state.member,
        });
      } else if (prevState.channel === null && state.channel !== null) {
        // 入室
        await sendNotification({
          type: "入室",
          guild: state.guild,
          vc: state.channel,
          member: state.member,
        });
      } else if (prevState.channel !== null && state.channel === null) {
        // 退出
        await sendNotification({
          type: "退室",
          guild: state.guild,
          vc: prevState.channel,
          member: state.member,
        });
      }
    } catch (e) {
      console.error(e);
    }
  });
});

client.login(
  JSON.parse(fs.readFileSync("config.json", { encoding: "utf8" })).token
);
