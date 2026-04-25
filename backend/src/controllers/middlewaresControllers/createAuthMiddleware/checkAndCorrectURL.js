function checkAndCorrectURL(url) {

  const hasHttps = url.startsWith('https://');

  
  url = url.replace(/^https?:\/\//i, '');


  url = url.replace(/\/+$/, '');

  const httpType = hasHttps ? 'https://' : 'http://';
  return httpType + url;
}

module.exports = checkAndCorrectURL;
