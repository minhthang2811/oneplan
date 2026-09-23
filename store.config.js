// EAS Metadata reads this file (`metadataPath` in eas.json), not
// store.config.json directly, for one reason: App Review requires a contact
// name and phone number, and this repository is public. Everything else about
// the listing lives in store.config.json; those three fields come from the
// environment, so they reach App Store Connect without ever reaching git.
//
//   APPLE_REVIEW_FIRST_NAME=… APPLE_REVIEW_LAST_NAME=… APPLE_REVIEW_PHONE=… eas metadata:push
const config = require('./store.config.json');

const CONTACT = {
  firstName: 'APPLE_REVIEW_FIRST_NAME',
  lastName: 'APPLE_REVIEW_LAST_NAME',
  phone: 'APPLE_REVIEW_PHONE',
};

// Without this the schema check still fails, but it names `firstName` rather
// than the variable to set.
const missing = Object.values(CONTACT).filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Set ${missing.join(', ')} before running eas metadata — the App Review contact is kept out of this public repo.`,
  );
}

module.exports = {
  ...config,
  apple: {
    ...config.apple,
    review: {
      ...config.apple.review,
      ...Object.fromEntries(Object.entries(CONTACT).map(([field, name]) => [field, process.env[name]])),
    },
  },
};
