const http = require('http');

console.log('🔧 Vérification de la configuration du backend\n');

// Test de différentes URLs
const testUrls = [
  'http://localhost:3000/api/demenageurs',
  'http://127.0.0.1:3000/api/demenageurs',
  'http://192.168.1.13:3000/api/demenageurs',
  'http://10.0.2.2:3000/api/demenageurs'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(url, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            url,
            status: 'success',
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            demenageursCount: jsonData.data?.length || 0,
            success: jsonData.success,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            url,
            status: 'error',
            error: 'Invalid JSON response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 'error',
        error: error.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'timeout',
        error: 'Request timeout (5s)'
      });
    });
  });
}

async function runTests() {
  console.log('🔍 Test des URLs de connexion...\n');
  
  for (const url of testUrls) {
    const result = await testUrl(url);
    
    if (result.status === 'success') {
      console.log(`✅ ${result.url}`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Temps: ${result.responseTime}`);
      console.log(`   Déménageurs: ${result.demenageursCount}`);
      console.log(`   CORS: ${result.headers['access-control-allow-origin'] || 'Non configuré'}`);
      console.log(`   Content-Type: ${result.headers['content-type']}`);
      console.log('');
    } else {
      console.log(`❌ ${result.url}`);
      console.log(`   Erreur: ${result.error}\n`);
    }
  }
  
  console.log('📱 Configuration recommandée pour React Native:');
  console.log('   • Vérifiez que le serveur écoute sur 0.0.0.0:3000 (pas seulement localhost)');
  console.log('   • CORS doit être configuré pour accepter toutes les origines');
  console.log('   • Le pare-feu doit autoriser le port 3000');
  console.log('   • Pour Android Emulator: utilisez 10.0.2.2:3000');
  console.log('   • Pour appareil physique: utilisez votre IP locale:3000');
}

runTests().catch(console.error);
