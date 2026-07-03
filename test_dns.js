const dns = require('dns');
const https = require('https');

dns.lookup('ibavkiosk.com', (err, address) => {
  console.log('Resolved IP for ibavkiosk.com:', address);
});

https.get('https://ibavkiosk.com/', (res) => {
  console.log('HTTP GET / Status Code:', res.statusCode);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if(res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
        console.log('Redirects to:', res.headers.location);
    }
    console.log('Headers:', res.headers.server);
  });
}).on('error', (e) => {
  console.log('HTTP GET Error:', e.message);
});
