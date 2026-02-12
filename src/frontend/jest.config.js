module.exports = {
  testEnvironment: "jsdom",

  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}"
  ],

  modulePathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/"
  ]
};
