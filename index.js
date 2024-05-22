const express = require('express');
const cors = require('cors');
const mysql = require('mysql');

const app = express();

app.use(cors());

const db = mysql.createConnection({
  host: 'localhost',
  port: 3333,
  user: 'root',
  password: 'root',
  database: 'kck_pio_db', 
  timezone: 'Z' // zmiana strefy czasowej na UTC
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database');
});

app.get('/api/wydarzenia', (req, res) => {
  const sql = 
  `SELECT wydarzenia.id_wydarzenia, uslugodawca.nazwa_firmy, wydarzenia.nazwa, uslugodawca.adres, wydarzenia.zdjecie 
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy
  WHERE wydarzenia.czas_zakonczenia >= NOW()`; // zakończone wydarzenia nie pokazują się
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Something failed!' });
    } else {
      const events = result.map(event => {
        if (event.zdjecie) {
          event.image_base64 = event.zdjecie;
        }
        delete event.zdjecie;
        return event;
      });
      res.json(events);
    }
  });
});

app.get('/api/wydarzenia/szczegoly/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql = 
  `SELECT wydarzenia.nazwa, wydarzenia.opis, DATE_FORMAT(wydarzenia.czas_rozpoczecia, '%Y-%m-%d') AS czas_rozpoczecia, 
  DATE_FORMAT(wydarzenia.czas_zakonczenia, '%Y-%m-%d') AS czas_zakonczenia, 
  uslugodawca.nazwa_firmy, uslugodawca.adres, uslugodawca.email, uslugodawca.nr_telefonu
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.get('/api/wydarzenia/godziny_otwarcia/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql = 
  `SELECT godziny_otwarcia.dzien_tygodnia, godziny_otwarcia.otwarcie, godziny_otwarcia.zamkniecie
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy JOIN godziny_otwarcia ON uslugodawca.id_uslugodawcy = godziny_otwarcia.id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
