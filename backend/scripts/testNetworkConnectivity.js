const http = require('http');

console.log('🌐 Test de connectivité réseau pour l\'API\n');

// URLs à tester
const urls = [
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
            success: jsonData.success
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
  console.log('🔍 Test des différentes URLs...\n');
  
  for (const url of urls) {
    const result = await testUrl(url);
    
    if (result.status === 'success') {
      console.log(`✅ ${result.url}`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Temps: ${result.responseTime}`);
      console.log(`   Déménageurs: ${result.demenageursCount}`);
      console.log(`   Succès: ${result.success}\n`);
    } else {
      console.log(`❌ ${result.url}`);
      console.log(`   Erreur: ${result.error}\n`);
    }
  }
  
  console.log('📱 Recommandations pour React Native:');
  console.log('   • Android Emulator: http://10.0.2.2:3000');
  console.log('   • iOS Simulator: http://localhost:3000');
  console.log('   • Appareil physique: http://192.168.1.13:3000');
  console.log('   • Vérifiez que le pare-feu autorise le port 3000');
}

runTests().catch(console.error);
