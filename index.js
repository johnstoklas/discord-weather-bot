<script type='text/javascript' src='config.js'></script>

var apiKey = config.apiKey;

require('dotenv').config();
const QuickChart = require('quickchart-js');

const humidity = [];
const precipitation = [];
const temp = [];
const uv = [];
const wind = [];
const plotPoints = [];

const COMMAND_START = '/';
const COMMAND_SPLIT = ':';

const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');

const client = new Discord.Client({ intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers,
]});

client.on('ready', () => {
    console.log('bot is running');
});

client.on("messageCreate", msg => {
    if(msg.content.startsWith(COMMAND_START) && msg.content.includes(COMMAND_SPLIT)) {
        var string = msg.content.split(COMMAND_START)[1];
        var cityString = string.split(':')[0];
        var condition = string.split(':')[1];
        apiFetch(`https://api.tomorrow.io/v4/weather/forecast?location=${cityString}&units=imperial&timesteps=1h&apikey=${apiKey}`, condition, msg);
    }
    else if(msg.content.startsWith(COMMAND_START)) {
        var cityString = msg.content.split(COMMAND_START)[1];
        apiFetch(`https://api.tomorrow.io/v4/weather/realtime?location=${cityString}&units=imperial&apikey=${apiKey}`, null, msg);
    }
});

client.login(process.env.DISCORD_TOKEN)

async function apiFetch(api, condition, msg) {
    try {
        const response = await fetch(api);
        const data = await response.json();
        console.log(data)
        if(condition) {
            var i = 0;
            var city = data.location.name;
            data.timelines.hourly.forEach(element => {
                if(i <= 12) {
                    createArray(element, i, condition);
                    i++;
                }
            });
            var botResponse = botResponseText(condition);
            createGraph(condition, msg, city, botResponse);
        }
        else {
            pack = {
                city:data.location.name,
                dewPoint:data.data.values.dewPoint,
                humidity:data.data.values.humidity,
                precipProb:data.data.values.precipitationProbability,
                temp:data.data.values.temperature,
                uv:data.data.values.uvIndex,
                windSpeed:data.data.values.windSpeed,
            }
            createEmbed(pack, msg);
        }
    }
    catch (error) {
        console.log(error);
        const embed = new EmbedBuilder()
            .setTitle(`Oops!`)
            .setColor('#3974bd')
            .setDescription('Looks like the data you entered was incorrect. If you want the current forecast type: \"/city name\". If you want specific data for the next 12 hours about a conditon type: \"/city name:condition\". The conditions you can specify are humdity, precipitation, temperature, uvIndex, and windSpeed.')
            .setFooter({ text: 'Weather Bot', iconURL: 'https://i.pinimg.com/736x/40/d0/82/40d0826ad647e45505eeb400344a0d44.jpg' });
        msg.channel.send({ embeds: [embed] });
    }
}

function createEmbed(pack, msg) {
    const embed = new EmbedBuilder()
        .setColor('#3974bd')
        .setTitle(`Here is the current forecast in the ${pack.city}`)
        .setDescription('For more specific information over the next 12 hours add a \":\" to learn more.')
        .addFields(
            { name: 'Temperature', value: `${pack.temp}\u00B0F`, inline: true },
            { name: 'UV Index', value: `${pack.uv}`, inline: true },
            { name: 'Humidity', value: `${pack.humidity}%`, inline: true },
            { name: 'Dew Point', value: `${pack.dewPoint}\u00B0F`, inline: true },
            { name: 'Precipitation Probability', value: `${pack.precipProb}%`, inline: true },
            { name: 'Wind Speed', value: `${pack.windSpeed} mph`, inline: true },
        )
        .setFooter({ text: 'Weather Bot', iconURL: 'https://i.pinimg.com/736x/40/d0/82/40d0826ad647e45505eeb400344a0d44.jpg' });

    msg.channel.send({ embeds: [embed] });
}

function createArray(element, i, condition) {
    if(condition === 'humidity') {
        humidity[i] = element.values.humidity;
    }
    else if(condition === 'precipitation') {
        precipitation[i] = element.values.precipitationProbability;
    }
    else if(condition === 'temperature') {
        temp[i] = element.values.temperature;
    }
    else if(condition === 'uvIndex') {
        uv[i] = element.values.uvIndex;
    }
    else if(condition === 'windSpeed') {
        wind[i] = element.values.windSpeed;
    }
    plotPoints[i] = String(element.time).split('T')[1].split('Z')[0];
}

function botResponseText(condition) {
    if(condition === 'humidity') {
        avg = averageArray(humidity);
        if(avg < 30) {
            return 'There is not much humidity today.';
        }
        else if(avg > 30 && avg < 70) {
            return 'The humidity is average today.';
        }
        else if(avg > 70) {
            return 'Gross! It\s very humid out today.';
        }
    }
    else if(condition === 'precipitation') {
        avg = averageArray(precipitation);
        if(avg < 20) {
            return 'Look\'s like there is not much rain today.';
        }
        else if(avg > 20 && avg < 60) {
            return 'There might be some rain today. Fingers crossed there isn\'t.';
        }
        else if(avg > 60) {
            return 'Make sure you have an umbrella. There is most likely rain today.';
        }
    }
    else if(condition === 'temperature') {
        avg = averageArray(temp);
        if(avg < 50) {
            return 'It\'s chilly out there! Make sure to layer up.';
        }
        else if(avg > 50 && avg < 80) {
            return 'Lucky you! The temperature is perfect today.';
        }
        else if(avg > 80) {
            return 'Make sure you stay hydrated. It is very hot outside today.';
        }
    }
    else if(condition === 'uvIndex') {
        avg = averageArray(uv);
        if(avg < 3) {
            return 'No need for sunscreen, the UV is low.';
        }
        else if(avg > 3 && avg < 8) {
            return 'Make sure you wear some sunscreen. The UV is strong but not too high.';
        }
        else if(avg > 8) {
            return 'Wow! Make sure you are wearing sunscreen, the UV is super high.';
        }
    }
    else if(condition === 'windSpeed') {
        avg = averageArray(windSpeed);
        if(avg < 10) {
            return 'The forecast shows that there is a light breeze.';
        }
        else if(avg > 10 && avg < 20) {
            return 'The winds are pretty strong today.';
        }
        else if(avg > 20) {
            return 'It\'s super windy out today.';
        }
    }
}

function averageArray(array) {
    var total = 0;
    var count = 0;
    for(var i in array) {
        total+=Number(array[i]);
        count++;
    }
    return total/count;
}

function createGraph(condition, msg, city, botResponseText) {
    if(condition === 'humidity') {
        data = humidity;
        text = 'humidity';
        color = '#32a887';
    }
    else if(condition === 'precipitation') {
        data = precipitation;
        text = 'precipitation';
        color = '#3974bd';
    }
    else if(condition === 'temperature') {
        data = temp;
        text = 'temperature';
        color = '#decd18';
    }
    else if(condition === 'uvIndex') {
        data = uv;
        text = 'UV index';
        color = '#db9418';
    }
    else if(condition === 'windSpeed') {
        data = wind;
        text = 'wind speed';
        color = '#1fede3';
    }
    graph = {
        type: 'line',
        data: {
          labels: plotPoints,
          datasets: [
            {
              backgroundColor: color,
              borderColor: color,
              data: data,
              fill: false,
              label: condition,
            },
            
          ],
        },
        options: {
          legend: {
            display: false,
          }
        },
      }

    encodedChart = encodeURIComponent(JSON.stringify(graph));
    chartUrl = `https://quickchart.io/chart?c=${encodedChart}`;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Here is the ${text} in ${city} for the next 12 hours`)
        .setImage(chartUrl)
        .setDescription(botResponseText)
        .setFooter({ text: 'Weather Bot', iconURL: 'https://i.pinimg.com/736x/40/d0/82/40d0826ad647e45505eeb400344a0d44.jpg' });

    msg.channel.send({ embeds: [embed] });

}