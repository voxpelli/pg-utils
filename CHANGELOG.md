# Changelog

## [3.1.1](https://github.com/voxpelli/pg-utils/compare/v3.1.0...v3.1.1) (2026-03-12)


### 🩹 Fixes

* ensure proper cleanup during table operations ([#50](https://github.com/voxpelli/pg-utils/issues/50)) ([d871688](https://github.com/voxpelli/pg-utils/commit/d8716882a63cd30c4169126059f47cf6eb90bf7a))


### 🧹 Chores

* **deps:** update dependency @types/node to ^20.19.37 ([#51](https://github.com/voxpelli/pg-utils/issues/51)) ([cd4775a](https://github.com/voxpelli/pg-utils/commit/cd4775ac5c996dd38e5029c900b945d1590cf1a7))
* **deps:** update dependency c8 to v11 ([#54](https://github.com/voxpelli/pg-utils/issues/54)) ([492bd49](https://github.com/voxpelli/pg-utils/commit/492bd49850b2abd579881608664a95a77c5eb2a7))
* **deps:** update linting dependencies ([#53](https://github.com/voxpelli/pg-utils/issues/53)) ([c5e29fc](https://github.com/voxpelli/pg-utils/commit/c5e29fce5a3d6f72e89ce9e6c1becc204f374128))

## [3.1.0](https://github.com/voxpelli/pg-utils/compare/v3.0.1...v3.1.0) (2026-03-01)


### 🌟 Features

* add dbToCsvFolder export function ([ba6ae2d](https://github.com/voxpelli/pg-utils/commit/ba6ae2d3fbd4990f7a5940c98709a4848134e64d))
* add tableLoadOrder as intuitive replacement for tablesWithDependencies ([db8383e](https://github.com/voxpelli/pg-utils/commit/db8383e887e0a77013d65edf3d951fb30fb05c18))


### 🩹 Fixes

* clear lock client on acquisition failure ([dabdaf6](https://github.com/voxpelli/pg-utils/commit/dabdaf6f6aa72662bfc83cf4c388389acbbd30c7))
* escape SQL identifiers to prevent injection ([9f85b5b](https://github.com/voxpelli/pg-utils/commit/9f85b5b36fee4e981848ae963e5bef24f9c1410a))


### 📚 Documentation

* add DeepWiki badge to README ([9c9ffe6](https://github.com/voxpelli/pg-utils/commit/9c9ffe68dc4ea95a27b6ed214a8e88813a59d27d))
* document dbToCsvFolder and tableLoadOrder ([7ad5786](https://github.com/voxpelli/pg-utils/commit/7ad57867b8bc1b0757a5e0fa24e30e54d3fd2a11))

## [3.0.1](https://github.com/voxpelli/pg-utils/compare/v3.0.0...v3.0.1) (2026-02-18)


### 🩹 Fixes

* client wasn't released on csv import error ([#42](https://github.com/voxpelli/pg-utils/issues/42)) ([5bc84fa](https://github.com/voxpelli/pg-utils/commit/5bc84fac0f10d4c722200eec5be4a905b86b6a0a))


### 🧹 Chores

* **deps:** update dependencies ([#46](https://github.com/voxpelli/pg-utils/issues/46)) ([963bbd7](https://github.com/voxpelli/pg-utils/commit/963bbd73fab0502711846dddc180b4ff7c827527))

## [3.0.0](https://github.com/voxpelli/pg-utils/compare/v2.3.1...v3.0.0) (2026-01-27)


### ⚠ BREAKING CHANGES

* add locking to stop concurrent test runs ([#40](https://github.com/voxpelli/pg-utils/issues/40))

### 🌟 Features

* add locking to stop concurrent test runs ([#40](https://github.com/voxpelli/pg-utils/issues/40)) ([60a3d71](https://github.com/voxpelli/pg-utils/commit/60a3d7113074be212d845d6271837b0ccfb67c8a))


### 📚 Documentation

* fix type markdown ([d0b6222](https://github.com/voxpelli/pg-utils/commit/d0b622236d64e93d0152dd42f1b6f5ba05cbbb8e))

## [2.3.1](https://github.com/voxpelli/pg-utils/compare/v2.3.0...v2.3.1) (2026-01-23)


### 🩹 Fixes

* `#removeTablesByName` could cause deadlock ([e00c0de](https://github.com/voxpelli/pg-utils/commit/e00c0de3c0e54c6dc32b65d45b8c2ef2d3e3f396))


### 🧹 Chores

* **deps:** update dependency @voxpelli/tsconfig to v16 ([#31](https://github.com/voxpelli/pg-utils/issues/31)) ([922b844](https://github.com/voxpelli/pg-utils/commit/922b84452d33d8c086ba05a9f86945b750f6abc0))
* **deps:** update dependency dotenv to v17 ([#30](https://github.com/voxpelli/pg-utils/issues/30)) ([78d0ab8](https://github.com/voxpelli/pg-utils/commit/78d0ab86646dfa97ec410b3ab79cfd23c1d25b08))
* **deps:** update dependency mocha to ^11.7.5 ([#25](https://github.com/voxpelli/pg-utils/issues/25)) ([4a322db](https://github.com/voxpelli/pg-utils/commit/4a322db64e43909ad247825ead87b220300f0daa))
* **deps:** update dependency npm-run-all2 to v8 ([#27](https://github.com/voxpelli/pg-utils/issues/27)) ([9445710](https://github.com/voxpelli/pg-utils/commit/9445710c5f9e6f2f51157800804f2fed8f46af33))
* **deps:** update dependency pg-copy-streams to v7 ([#28](https://github.com/voxpelli/pg-utils/issues/28)) ([e9620a6](https://github.com/voxpelli/pg-utils/commit/e9620a6406fee5f8fab034faab3c0a8b0fb8634d))
* **deps:** update linting dependencies ([#26](https://github.com/voxpelli/pg-utils/issues/26)) ([202413e](https://github.com/voxpelli/pg-utils/commit/202413eeea64fc92cbac0227f829af5d34d2ee4e))
* **deps:** update type dependencies ([#24](https://github.com/voxpelli/pg-utils/issues/24)) ([d79f856](https://github.com/voxpelli/pg-utils/commit/d79f8562cd41b3e915da1083179ea7751543baa7))
* opt-in husky setup ([507d39a](https://github.com/voxpelli/pg-utils/commit/507d39a9daf88c89c7368c239c119e9c1599647d))
* streamline knip config ([5eb5624](https://github.com/voxpelli/pg-utils/commit/5eb562445e5f0448ac4b67bfc08a1428b64c8740))

## [2.3.0](https://github.com/voxpelli/pg-utils/compare/v2.2.0...v2.3.0) (2025-04-29)


### 🌟 Features

* add `ignoreTables` option ([#22](https://github.com/voxpelli/pg-utils/issues/22)) ([786a9a1](https://github.com/voxpelli/pg-utils/commit/786a9a1a9e3a25b72a0ed4bf2de95047e73a0359))

## [2.2.0](https://github.com/voxpelli/pg-utils/compare/v2.1.0...v2.2.0) (2025-04-25)


### 🌟 Features

* add `pool` argument to `schema` ([#21](https://github.com/voxpelli/pg-utils/issues/21)) ([fc7633c](https://github.com/voxpelli/pg-utils/commit/fc7633ceec4ff18691bf62a166969dbe9128b702))


### 🧹 Chores

* **deps:** update dependency typescript to ~5.8.3 ([#20](https://github.com/voxpelli/pg-utils/issues/20)) ([bf6ff8d](https://github.com/voxpelli/pg-utils/commit/bf6ff8d9b45dd1949af935f7c099cac41481dc1c))
* **deps:** update dev dependencies + fix linting ([#16](https://github.com/voxpelli/pg-utils/issues/16)) ([33fc718](https://github.com/voxpelli/pg-utils/commit/33fc718cd23d793aef3ace887feee368dfebf6a8))
* **deps:** update linting dependencies ([#19](https://github.com/voxpelli/pg-utils/issues/19)) ([5f5face](https://github.com/voxpelli/pg-utils/commit/5f5face289be3202f4dafe89d0fc2b4183933f37))
* **deps:** update type dependencies ([#18](https://github.com/voxpelli/pg-utils/issues/18)) ([bc30b1c](https://github.com/voxpelli/pg-utils/commit/bc30b1cef444eaa302da9d549206b6ce3326a165))

## [2.1.0](https://github.com/voxpelli/pg-utils/compare/v2.0.0...v2.1.0) (2025-02-05)


### 🌟 Features

* expose `end()` ([85fa98c](https://github.com/voxpelli/pg-utils/commit/85fa98c51fd7cac09a58d0f776c9955f3ace853f))

## [2.0.0](https://github.com/voxpelli/pg-utils/compare/v1.2.0...v2.0.0) (2025-02-05)


### ⚠ BREAKING CHANGES

* recreate the umzeption context on each run ([#14](https://github.com/voxpelli/pg-utils/issues/14))

### 🩹 Fixes

* recreate the umzeption context on each run ([#14](https://github.com/voxpelli/pg-utils/issues/14)) ([be1cae5](https://github.com/voxpelli/pg-utils/commit/be1cae54eba9842f56ce782f98b2c802fc47105b))


### 🧹 Chores

* **deps:** update dependency dotenv to ^16.4.7 ([#10](https://github.com/voxpelli/pg-utils/issues/10)) ([b35d214](https://github.com/voxpelli/pg-utils/commit/b35d214c963cc954265ab1d3a954c054554dcd56))
* **deps:** update dependency mocha to v11 ([#7](https://github.com/voxpelli/pg-utils/issues/7)) ([fc9ea77](https://github.com/voxpelli/pg-utils/commit/fc9ea771253fc8afbcc65041d9b9c4658422f21b))
* **deps:** update linting dependencies ([#12](https://github.com/voxpelli/pg-utils/issues/12)) ([e4d001e](https://github.com/voxpelli/pg-utils/commit/e4d001e972c7f84dc97ff9e9fda30329e1ec3b1e))
* **deps:** update test dependencies ([#11](https://github.com/voxpelli/pg-utils/issues/11)) ([cce08ac](https://github.com/voxpelli/pg-utils/commit/cce08acc3a05218c6650738128e0bf2c24274adc))
* **deps:** update type dependencies ([#9](https://github.com/voxpelli/pg-utils/issues/9)) ([10f19a2](https://github.com/voxpelli/pg-utils/commit/10f19a2703f98ee8c04a53efdb685acee33e4502))

## [1.2.0](https://github.com/voxpelli/pg-utils/compare/v1.1.2...v1.2.0) (2024-12-04)


### 🌟 Features

* use `HEADER MATCH` (requires pg 15) ([887d957](https://github.com/voxpelli/pg-utils/commit/887d957e8613035e574654f59f50e33fc654cb1d))

## [1.1.2](https://github.com/voxpelli/pg-utils/compare/v1.1.1...v1.1.2) (2024-12-03)


### 🩹 Fixes

* the umzug schema types, make it more narrow ([87b80e6](https://github.com/voxpelli/pg-utils/commit/87b80e6ef4d94628a970f19a28da7457999c9aba))


### 🧹 Chores

* fix timezone troubles ([#5](https://github.com/voxpelli/pg-utils/issues/5)) ([cea20e0](https://github.com/voxpelli/pg-utils/commit/cea20e092728f852267e298bcec730057b44696e))

## [1.1.1](https://github.com/voxpelli/pg-utils/compare/v1.1.0...v1.1.1) (2024-12-03)


### 🧹 Chores

* fix and extend tests ([97f0298](https://github.com/voxpelli/pg-utils/commit/97f02980e5bc3e9b80c69cefb9e21d67df3b05ff))

## [1.1.0](https://github.com/voxpelli/pg-utils/compare/v1.0.0...v1.1.0) (2024-12-03)


### 🌟 Features

* initial version of module ([d4c0f35](https://github.com/voxpelli/pg-utils/commit/d4c0f35106b34db0d9b25aa1aff824a0534bcc27))


### 🩹 Fixes

* add `umzug` to dependencies ([b504901](https://github.com/voxpelli/pg-utils/commit/b5049012123190a2ba5787d60867596b9e20f5fd))
* tweaks ([db58fb7](https://github.com/voxpelli/pg-utils/commit/db58fb7cc2a584782e0e508c142f515ec8e8b900))
