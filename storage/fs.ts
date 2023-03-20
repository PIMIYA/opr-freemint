import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { fsConfig } from "./config";

export const fsApp = initializeApp(fsConfig);
export const fsDatabase = getFirestore(fsApp);
export const fsStorage = getStorage(fsApp);