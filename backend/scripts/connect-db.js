(async () => {
  try {
    // ensure cwd is backend
    process.chdir(__dirname + '/..');
    const adapter = require('./../database/adapter');
    const res = await adapter.connect();
    console.log('CONNECT_RESULT', JSON.stringify(res));
  } catch (e) {
    console.error('CONNECT_ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
