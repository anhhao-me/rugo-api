const jwt = require('jsonwebtoken');

module.exports.verify = async (rawToken, secret) => {
  if (!rawToken)
    return false;

  const ps = rawToken.split(' ');
  if (!ps[0] || ps[0].trim().toLowerCase() !== 'jwt' || !ps[1] || !ps[1].trim() ){
    return false;
  }

  const token = ps[1].trim();

  try {
    return jwt.verify(token, secret);
  } catch(err){
    return false;
  }
}