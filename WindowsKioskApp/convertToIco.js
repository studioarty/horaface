const pngToIco = require('png-to-ico');
const fs = require('fs');

const converter = typeof pngToIco === 'function' ? pngToIco : pngToIco.default || pngToIco.pngToIco;

converter('C:\\Users\\IBAV-IA\\.gemini\\antigravity\\brain\\4ea52654-770d-4d72-9945-39e12bca72ab\\kiosk_app_icon_1773669869486.png')
    .then(buf => {
        fs.writeFileSync('build/icon.ico', buf);
        console.log('COVERSAO_CONCLUIDA');
    })
    .catch(err => console.error('ERRO_CONVERSAO', err));
