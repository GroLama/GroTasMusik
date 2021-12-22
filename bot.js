const Discord = require("discord.js");
const { prefix, token, key } = require("./config.json");
const ytdl = require("ytdl-core");
let fs = require('fs')
const youtube=require('youtube-search-api');
const { parse } = require("path");


const client = new Discord.Client();
const embedMessage = new Discord.MessageEmbed()
.setColor('#0099ff')
.setTitle('TIENS BATARD')
.setAuthor('GroTas Musik', 'https://www.media.pokekalos.fr/img/pokemon/pokerush/big/mystherbe.png')
.setDescription('Choisis la musique en sélectionnant l\'emoji')
.setThumbnail('https://www.media.pokekalos.fr/img/pokemon/pokerush/big/mystherbe.png')
.addFields(
  { name: 'Playlist', value: 'Playlist' }
);
const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
  console.log(message);
  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if(message.content.startsWith(`${prefix}list`)) {
    playlist(message, serverQueue);
    return; 
  } else {
    message.channel.send("Mauvaise commande mon reuf !");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");
  args[1] = args.slice(1).join(' ')
  history(args[1])
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "T'es pas dans un salon vocal chien"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "T'es pas dans un salon vocal chien "
    );
  }
  const key = await youtube.GetListByKeyword(args[1],false,1).then((res=>{
    return res
  })
  )
  const url_ytb = "https://www.youtube.com/watch?v=" + (key.items[0].id)
  const songInfo = await ytdl.getInfo(url_ytb);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} est ajouté à la file d'attente !`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "T'es pas dans un salon vocal salopard"
    );
  if (!serverQueue)
    return message.channel.send("Nice try batard mais y'a rien à skip");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "T'es pas dans un salon vocal salopard !"
    );
    
  if (!serverQueue)
    return message.channel.send("Nice try batard mais y'a rien à stop !");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url),{quality: 'highestaudio',
    highWaterMark: 1 << 25})
    .on("finish", () => {
      
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Et c'est parti pour : **${song.title}**`);
}


async function playlist(message, serverQueue) {
  
  
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "T'es pas dans un salon vocal chien"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "T'es pas dans un salon vocal chien "
    );
  }

  const dictList = {
    1:'1️⃣',
    2:'2️⃣',
    3:'3️⃣',
    4:'4️⃣',
    5:'5️⃣',
    6:'6️⃣',
    7:'7️⃣',
    8:'8️⃣',
    9:'9️⃣',
  }
  const directory = './playlist'
  files = fs.readdirSync(directory);
  filesCount = files.length;
  
  //ADD MESSAGE WITH PLAYLIST NAME 
  for(let y =0; y<filesCount;y++){
    let splitName = files[y].split(".")
    embedMessage.addField(dictList[y+1]+" : "+String(splitName[0]),"🎶🎶 Yaaaaaaaaahh 🎶🎶")
  }
  //ADD EMOJI TO PLAYLIST MESSAGE
  (async () => {
    let m = await message.channel.send(embedMessage);
    for(let i =0; i<filesCount;i++){
      
      await m.react(dictList[i+1])
    }
    })();
    client.on('messageReactionAdd',async(reaction,user)=>{
      if(user.id!==client.user.id){
        let pathToFile = directory+"/"+String(files[(getKeyByValue(dictList,reaction["_emoji"]["name"])-1)])
        let songList =findSong(pathToFile)
        for(let i =0; i<songList.length;i++)
        {
          serverQueue = queue.get(message.guild.id);
          await execute_wo(message,songList[i].replace(/&/g," "),serverQueue)
          
        }
        
      }
    })
  
}
//Function that read playlist file
function findSong(file){
  let fileRead = fs.readFileSync(file, {encoding:'utf8', flag:'r'}).toString().split('\n')
  return fileRead
}
 

//Get Key by Value for Object
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}
//COPY OF EXECUTE FUNCTION FOR PLAYLIST
async function execute_wo(message,value, serverQueue) {
  args=[]
  args[0] = value
  
  
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "T'es pas dans un salon vocal chien"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "T'es pas dans un salon vocal chien "
    );
  }
  const key = await youtube.GetListByKeyword(args[0],false,1).then((res=>{
    return res
  })
  )
  
  const url_ytb = "https://www.youtube.com/watch?v=" + (key.items[0].id)  
  const songInfo = await ytdl.getInfo(url_ytb);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
      
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} est ajouté à la file d'attente !`);
  }
}

function history(value){
  let historyList = fs.readFileSync('./playlist/historique.txt', {encoding:'utf8', flag:'r'}).toString().split('\n')
  let check = true
  for(let i =0; i<historyList.length;i++)
        {
          if(historyList[i]==value){
            check = false
          }
        }
        if(check){
          fs.appendFile('./playlist/historique.txt','\n'+ value, function (err) {
            if (err) throw err;
            return
         });
        }
}
client.login(token);