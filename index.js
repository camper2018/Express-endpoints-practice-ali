const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get('/cars', async function(req, res) {
  try {
    const query = 'SELECT * FROM car WHERE deleted_flag=:deleted_flag';
    const [result] = await req.db.query(query, {deleted_flag: 0});
    res.status(200).json({success: true, data: result});
  } catch (err) {
    console.error(err);
    res.status(500).json({success: false, message: err, data: null})
  }
});


app.post('/car', async function(req, res) {
  try {
    const { make, model, year } = req.body;
    const query = await req.db.query(
      `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
      {
        make,
        model,
        year,
      }
    );
  
    res.json({ success: true, message: 'Car successfully created', data: null });
  } catch (err) {
    res.json({ success: false, message: err, data: null })
  }
});

app.delete('/car/:id', async function(req,res) {
  try {
    const {id} = req.params;
    const query = `UPDATE car SET deleted_flag = :deleted_flag  WHERE id = :id`;
    await req.db.query(query, { deleted_flag: 1, id: parseInt(id)});
    const [result] = await req.db.query('SELECT * FROM car WHERE id = :id', {id: parseInt(id)});
    res.status(200).json({success: true, message: `Successfully deleted car with id ${id}`, data: result})
  } catch (err) {
    res.json({ success: false, message: err, data: null })
  }
});

app.put('/car/:id', async function(req,res) {
  try {
    const { id } = req.params;
    const {model, make, year} = req.body;
    const query = 'UPDATE car SET model = :model, make = :make, year = :year WHERE id = :id';
    await req.db.query(query, {make, model, year, id: parseInt(id)});
    const [result] = await req.db.query('SELECT * FROM car WHERE id = :id', {id: parseInt(id)});
    res.status(200).json({success: true, message: `Successfully updated car with id ${id}`, data: result})

  } catch (err) {
    res.status(500).json({ success: false, message: err, data: null })
  }
});
app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));