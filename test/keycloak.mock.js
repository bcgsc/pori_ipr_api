// fake the KC token
jest.mock('../app/api/keycloak', () => {
    const nconf = require('../app/config');
    const fs = require('fs'); // eslint-disable-line
    const jwt = require('jsonwebtoken');  // eslint-disable-line
    const PRIVATE_KEY = fs.readFileSync('test/keys/authkey');

    return {
        getToken: async (username, password) => {
            const {clientId} = nconf.get('keycloak');
            return  {
                access_token: jwt.sign(
                    {
                        preferred_username: username,
                        realm_access: {
                            roles: [clientId],
                        },
                    },
                    PRIVATE_KEY,
                    { algorithm: 'RS256', expiresIn: 10000000000 },
                )
            };
        }
    };
});
