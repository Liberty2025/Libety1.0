require('dotenv').config();
const pool = require('../db');
const fs = require('fs');
const path = require('path');

// Tables réelles dans la base de données
const realTables = new Set([
  'ai_knowledge', 'ai_messages', 'ai_sessions', 'ai_usage',
  'client_profiles', 'codes_promo', 'contracts', 'conversations',
  'demenageur_evaluations', 'demenageur_gift_stats', 'demenageur_gifts',
  'demenageur_payment_preferences', 'demenageur_payments', 'demenageur_scores',
  'demenageur_specialties', 'demenageur_subscription', 'demenageur_subscriptions',
  'messages', 'move_events', 'move_live_tracking', 'mover_availability',
  'mover_profiles', 'moves', 'notification_logs', 'notifications',
  'offers', 'password_history', 'payments', 'quotes', 'reservations',
  'scoring_config', 'scoring_config_history', 'security_activity_log',
  'subscription_plans', 'tickets', 'user_devices', 'user_locations',
  'user_ratings', 'user_security_settings', 'users', 'users_location'
]);

async function getRealTables() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return new Set(result.rows.map(r => r.table_name));
}

async function analyzeTableReferences() {
  try {
    const realTablesSet = await getRealTables();
    
    console.log('\n🔍 Analyse des références aux tables dans le code...\n');
    
    // Tables utilisées dans le code (basé sur le grep précédent)
    const codeTables = new Set();
    const tableReferences = {};
    
    // Analyser les fichiers routes
    const routesDir = path.join(__dirname, '../routes');
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Chercher les références aux tables dans les requêtes SQL
      const tablePatterns = [
        /FROM\s+(\w+)/gi,
        /INTO\s+(\w+)/gi,
        /UPDATE\s+(\w+)/gi,
        /JOIN\s+(\w+)/gi,
        /tableName:\s*['"]([\w_]+)['"]/gi,
        /table_name\s*=\s*['"]([\w_]+)['"]/gi
      ];
      
      for (const pattern of tablePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const tableName = match[1];
          if (tableName && !tableName.match(/^(SELECT|WHERE|AND|OR|ORDER|GROUP|HAVING|LIMIT|OFFSET|SET|VALUES|RETURNING|information_schema|public)$/i)) {
            codeTables.add(tableName);
            if (!tableReferences[tableName]) {
              tableReferences[tableName] = [];
            }
            tableReferences[tableName].push(`${file}:${content.substring(0, match.index).split('\n').length}`);
          }
        }
      }
    }
    
    // Analyser server.js
    const serverPath = path.join(__dirname, '../server.js');
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf8');
      const tablePatterns = [
        /FROM\s+(\w+)/gi,
        /INTO\s+(\w+)/gi,
        /UPDATE\s+(\w+)/gi,
        /JOIN\s+(\w+)/gi
      ];
      
      for (const pattern of tablePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const tableName = match[1];
          if (tableName && !tableName.match(/^(SELECT|WHERE|AND|OR|ORDER|GROUP|HAVING|LIMIT|OFFSET|SET|VALUES|RETURNING|information_schema|public)$/i)) {
            codeTables.add(tableName);
            if (!tableReferences[tableName]) {
              tableReferences[tableName] = [];
            }
            tableReferences[tableName].push(`server.js:${content.substring(0, match.index).split('\n').length}`);
          }
        }
      }
    }
    
    console.log('📊 Tables référencées dans le code:');
    const sortedCodeTables = Array.from(codeTables).sort();
    sortedCodeTables.forEach(table => {
      const exists = realTablesSet.has(table);
      const icon = exists ? '✅' : '❌';
      console.log(`   ${icon} ${table} ${exists ? '' : '(N\'EXISTE PAS)'}`);
    });
    
    console.log('\n❌ Tables utilisées dans le code mais qui n\'existent PAS dans la base:');
    const missingTables = sortedCodeTables.filter(t => !realTablesSet.has(t));
    if (missingTables.length === 0) {
      console.log('   Aucune ! ✅');
    } else {
      missingTables.forEach(table => {
        console.log(`\n   🔴 ${table}:`);
        console.log(`      Références: ${tableReferences[table].join(', ')}`);
        
        // Suggestions de remplacement
        if (table === 'chats') {
          console.log(`      💡 Suggestion: Utiliser 'conversations'`);
        } else if (table === 'chat_messages') {
          console.log(`      💡 Suggestion: Utiliser 'messages'`);
        } else if (table === 'service_requests') {
          console.log(`      💡 Suggestion: Utiliser 'quotes'`);
        }
      });
    }
    
    console.log('\n✅ Tables dans la base mais non utilisées dans le code:');
    const unusedTables = Array.from(realTablesSet).filter(t => !codeTables.has(t)).sort();
    if (unusedTables.length === 0) {
      console.log('   Toutes les tables sont utilisées ! ✅');
    } else {
      unusedTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    console.log('\n📋 Résumé:');
    console.log(`   - Tables dans la base: ${realTablesSet.size}`);
    console.log(`   - Tables référencées dans le code: ${codeTables.size}`);
    console.log(`   - Tables manquantes: ${missingTables.length}`);
    console.log(`   - Tables non utilisées: ${unusedTables.length}\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

analyzeTableReferences();

