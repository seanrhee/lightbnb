const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');
const { query } = require('express');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE email = $1
    `, [email])
    .then(res => {
      if (res.rows.length === 0) {
        return null;
      }

      console.log(res.rows[0]);
      return res.rows[0];
    })
    .catch(err => {
      console.error('query error', err);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE id = $1
    `, [id])
    .then(res => {
      if (res.rows.length === 0) {
        return null;
      }

      console.log(res.rows[0]);
      return res.rows[0];
    })
    .catch(err => {
      console.error('query error', err);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
    `, [user.name, user.email, user.password])
    .then(res => {
      console.log(res.rows)
    })
    .catch(err => {
      console.error('query error', err);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`SELECT reservations.*, properties.*, property_reviews.*
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id, property_reviews.id
    ORDER BY reservations.start_date
    LIMIT $2
    `, [guest_id, limit])
    .then(res => {
      console.log(res);
      return res.rows;
    })
    .catch(err => {
      console.error('query error', err);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {

  const queryParams = [];

  // generic sql query string
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // when user clicks "my listings"
  if (options.owner_id) {
    queryParams.push(Number(options.owner_id));
    queryString += `WHERE owner_id = $${queryParams.length} `
  }

  // if city is in the search param
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  // if min/max price are in the search param
  if (options.minimum_price_per_night) {
    queryParams.push(Number(options.minimum_price_per_night));
    queryString += `AND cost_per_night > $${queryParams.length} `;
  }
  if (options.maximum_price_per_night) {
    queryParams.push(Number(options.maximum_price_per_night));
    queryString += `AND cost_per_night < $${queryParams.length} `;
  }

  // add GROUP BY statement
  queryString += `
  GROUP BY properties.id
  `

  // if minimum rating is in the search param 
  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }
  
  // add order by + limit
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // log queryString and the params to the console
  console.log(queryString, queryParams);

  return pool
    .query(queryString, queryParams)
    .then(res => {
      return res.rows;
    })
    .catch(err => {
      console.error('query error', err);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
