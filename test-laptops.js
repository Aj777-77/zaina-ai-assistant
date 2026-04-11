import fs from 'fs';

// Since we can't easily init firebase in a dirty env, let's just search the JSON dump or write a proper script using the existing \`getDb()\` if we compile it.
// Wait, let's do a curl to Firestore API directly? No, auth.
// Let's use ts-node or run Next.js server?
