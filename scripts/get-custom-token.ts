import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
dotenv.config();

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production",
  });
}

async function run() {
  const uid = "VmLNwwZczbcTpJT2lFfakaunqtD2";
  const token = await getAuth().createCustomToken(uid);
  console.log("CUSTOM_TOKEN:", token);
}
run();
