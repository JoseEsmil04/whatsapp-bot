const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT ?? 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/audios', express.static(path.join(__dirname, 'audios')));

app.post('/whatsapp', async (req, res) => {
  const twiml = new MessagingResponse();
  const message = req.body.Body.toLowerCase();

  if (message.startsWith('buscar musica ')) {
    const query = message.replace('buscar musica ', '');
    const musicDetails = await buscarMusica(query);
    const audioLink = await convertirTextoAVoz(musicDetails.title);
    twiml.message(`Aquí está tu nota de voz: ${audioLink}`);
  } else if (message.startsWith('grabar nota ')) {
    const texto = message.replace('grabar nota ', '');
    const audioLink = await convertirTextoAVoz(texto);
    twiml.message(`Aquí está tu nota de voz: ${audioLink}`);
  } else {
    const audioLink = await convertirTextoAVoz(message);
    twiml.message(`Aquí está tu nota de voz: ${audioLink}`);
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

const buscarMusica = async (query) => {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  const response = await axios.get(url);
  const videoId = response.data.items[0].id.videoId;
  const title = response.data.items[0].snippet.title;
  return { videoId, title };
};

const convertirTextoAVoz = async (texto) => {
  const apiKey = process.env.TEXT_TO_SPEECH_CLOUD;
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const response = await axios.post(url, {
    input: { text: texto },
    voice: { languageCode: 'es-ES', name: 'es-ES-Standard-A' },
    audioConfig: { audioEncoding: 'MP3' }
  });

  const audioContent = response.data.audioContent;
  const audioBuffer = Buffer.from(audioContent, 'base64');
  const fileName = `your_audio_${Date.now()}.mp3`;
  const filePath = path.join(__dirname, 'audios', fileName);
  fs.writeFileSync(filePath, audioBuffer);

  return `http://yourdomain.com/audios/${fileName}`;
};

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT} `);
});
