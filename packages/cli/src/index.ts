import { truncate } from '@mini-gemini/core';

const banner = 'mini-gemini is alive! '.repeat(20);
console.log(truncate(banner, 60));
