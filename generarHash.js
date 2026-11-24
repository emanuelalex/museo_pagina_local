const bcrypt = require('bcrypt');

async function generarHash() {
    const password = 'alex1234';
    const hash = await bcrypt.hash(password, 10);

    console.log('Hash generado:', hash);
}

generarHash();