import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Sequelize, DataTypes } from 'sequelize';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './base.db' 
});

const donnee = database.define('donnée', {
  entre: { type: DataTypes.STRING },
  sortie:{ type: DataTypes.STRING }

});
database.sync().then(() => {
  for (let i = 0; i < 30; i++) {
    donnee.create({
      entre: `${Math.random().toString(36).substring(2, 8)}`,
      sortie: `${Math.random().toString(36).substring(2, 8)}`
    });
  }
});


const PORT = 5000;
const app = express();
app.enable('trust proxy')
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Ceci permet l'accès à Socket.IO depuis n'importe quelle origine
      methods: ["GET", "POST"],
    }
  });
  
  io.on('connection', (socket) => {
    console.log('Un client s\'est connecté');
    
    // Émettre immédiatement un événement de test après la connexion
    socket.emit('testEvent', 'Ceci est un test');
  
    // Vous pouvez également émettre des événements en réponse à certains messages du client si nécessaire
    socket.on('unAutreEvenement', (data) => {
      // Répondre ou traiter les données reçues
    });
  
    // Ne pas oublier de gérer la déconnexion
    socket.on('disconnect', () => {
      console.log('Client déconnecté');
    });
  });
  
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.get('/salutation', (req, res) => {
  res.send('Bonjour tout le monde');
});

app.post('/', async (req, res) => {
    const { entre, sortie } = req.body;
    try {
        const nouvelleDonnee = await donnee.create({ entre, sortie });
        const donnees = await donnee.findAll()
        io.emit('nouvelleDonnee', { data: donnees });
        res.status(200).json(nouvelleDonnee);
    } catch (erreur) {
        res.status(500).json(erreur);
    }
});

app.get('/', async (req, res) => {
  console.log("hi")
    const a = await donnee.findAll();
    res.status(200).json(a);
});

app.delete('/', async(req, res) => {
  const { id } = req.body;
  try {
    const item = await donnee.findByPk(id);
    if (!item) {
      res.status(400).json('Erreur de clé');
    } else {
      await item.destroy();
      const donnees = await donnee.findAll();
      io.emit('nouvelleDonnee', { data: donnees }); // Assurez-vous que cela est exécuté
      
      // Ajoutez un log pour vérifier si l'événement est émis avec succès
      console.log('Événement nouvelleDonnee émis avec succès');
      
      res.status(200).json('Suppression réussie');
    }
  } catch (erreur) {
    res.status(500).json(erreur);
  }
});



server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
