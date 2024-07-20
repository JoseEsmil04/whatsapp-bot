require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT ?? 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken); // Inicialización del cliente de Twilio

const { MessagingResponse } = twilio.twiml;

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/audios', express.static(path.join(__dirname, 'audios')));

app.post('/whatsapp', async (req, res) => {
  const twiml = new MessagingResponse();
  const message = req.body.Body.toLowerCase();

  try {
    let audioLink;

    if (message.startsWith('buscar musica ')) {
      const query = message.replace('buscar musica ', '');
      const musicDetails = await buscarMusica(query);
      audioLink = await convertirTextoAVoz(musicDetails.title);
    } else if (message.startsWith('grabar nota ')) {
      const texto = message.replace('grabar nota ', '');
      audioLink = await convertirTextoAVoz(texto);
    } else {
      audioLink = await convertirTextoAVoz(message);
    }

    twiml.message(`Aquí está tu nota de voz: ${audioLink}`);

    // Si deseas enviar un mensaje con Twilio, puedes usar el cliente aquí
    await client.messages.create({
      body: `Aquí está tu nota de voz: ${audioLink}`,
      from: 'whatsapp:+14155238886', // Número de Twilio
      to: req.body.From
    });

  } catch (error) {
    console.error('Error processing message:', error);
    twiml.message('Hubo un error procesando tu solicitud. Intenta nuevamente.');
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

const buscarMusica = async (query) => {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const items = response.data.items;
    if (items.length === 0) {
      throw new Error('No se encontraron resultados para la búsqueda.');
    }
    const videoId = items[0].id.videoId;
    const title = items[0].snippet.title;
    return { videoId, title };
  } catch (error) {
    console.error('Error buscando música:', error);
    throw error; // Propaga el error para que pueda ser manejado en la ruta
  }
};

const convertirTextoAVoz = async (texto) => {
  const apiKey = process.env.TEXT_TO_SPEECH_CLOUD;
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  try {
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
  } catch (error) {
    console.error('Error convirtiendo texto a voz:', error);
    throw error; // Propaga el error para que pueda ser manejado en la ruta
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
