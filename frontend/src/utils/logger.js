export const secureLog = (msg, data = null) => {
  if (import.meta.env.DEV) {
    if (data) console.log(`[KiwKiw] ${msg}`, data);
    else console.log(`[KiwKiw] ${msg}`);
  } else {
    if (data instanceof Error) {
      console.error(`[KiwKiw] ${msg}`, data.message);
    } else if (typeof data === 'string') {
      console.error(`[KiwKiw] ${msg} ${data}`);
    } else {
      console.error(`[KiwKiw] ${msg}`);
    }
  }
};
