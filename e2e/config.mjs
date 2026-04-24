// Central config for E2E runs. Switch env var MODE=local|prod.
const mode = process.env.MODE || "local";

export const MODE = mode;

export const URLS = mode === "prod"
  ? {
      P1: "https://humorproject.arinjaff.com",
      P2: "https://humorprojectadmin.arinjaff.com",
      P3: "https://prompt-chain-tool-blush.vercel.app",
    }
  : {
      P1: "http://localhost:3000",
      P2: "http://localhost:3001",
      P3: "http://localhost:3002",
    };

export const AUTH_DIR = new URL("./.auth/", import.meta.url).pathname;
export const SCREEN_DIR = new URL("../screenshots/", import.meta.url).pathname;
export const E2E_TAG = `E2E_TEST_${new Date().toISOString().replace(/[:.]/g, "-")}`;
