import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\nAdicione estas linhas ao seu arquivo .env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('');
