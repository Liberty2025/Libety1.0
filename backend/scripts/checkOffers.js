require('dotenv').config();
const pool = require('../db');

async function checkOffers() {
  try {
    const offers = await pool.query(`
      SELECT o.*, q.client_id, q.status as quote_status
      FROM offers o
      JOIN quotes q ON o.quote_id = q.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Nombre d'offres trouvées: ${offers.rows.length}\n`);
    
    if (offers.rows.length > 0) {
      console.log('Dernières offres:');
      offers.rows.forEach((o, index) => {
        console.log(`\n${index + 1}. Offre ID: ${o.id}`);
        console.log(`   - Quote ID: ${o.quote_id}`);
        console.log(`   - User ID: ${o.user_id}`);
        console.log(`   - Amount: ${o.amount} (${o.amount / 100} TND)`);
        console.log(`   - Status: ${o.status}`);
        console.log(`   - User Type: ${o.user_type}`);
        console.log(`   - Client ID: ${o.client_id}`);
        console.log(`   - Quote Status: ${o.quote_status}`);
      });
    } else {
      console.log('Aucune offre trouvée dans la base de données.');
    }
    
    // Vérifier aussi les quotes avec price_cents
    const quotesWithPrice = await pool.query(`
      SELECT id, client_id, mover_id, price_cents, status
      FROM quotes
      WHERE price_cents IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Quotes avec price_cents: ${quotesWithPrice.rows.length}\n`);
    if (quotesWithPrice.rows.length > 0) {
      quotesWithPrice.rows.forEach((q, index) => {
        console.log(`${index + 1}. Quote ID: ${q.id}`);
        console.log(`   - Client ID: ${q.client_id}`);
        console.log(`   - Mover ID: ${q.mover_id || 'NULL'}`);
        console.log(`   - Price: ${q.price_cents} cents (${q.price_cents / 100} TND)`);
        console.log(`   - Status: ${q.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkOffers();

