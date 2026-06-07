// Global Jest auto-mock for AsyncStorage (its native module is unavailable under
// Jest). The package ships an in-memory mock; re-export it so every test that
// (transitively) imports the persisted todo store gets a working storage.
module.exports = require("@react-native-async-storage/async-storage/jest/async-storage-mock");
