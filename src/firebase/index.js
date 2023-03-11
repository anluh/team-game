import { onUnmounted, ref, reactive } from "vue";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  doc,
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKSl71Lp86IrdU42J1mK4owlMUvUH044c",
  authDomain: "team-game-c9ca7.firebaseapp.com",
  projectId: "team-game-c9ca7",
  storageBucket: "team-game-c9ca7.appspot.com",
  messagingSenderId: "5678428637",
  appId: "1:5678428637:web:c952bb9f9cd79afc470634",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const usertsCollection = collection(db, "users");

// CRUD USERS

export const createUser = async (user) => {
  const currentUser = await addDoc(collection(db, "users"), user);

  window.sessionStorage.setItem("user", currentUser.id);
};

export const getUserQuestOrder = (id) => {
    const userQuestOrder = ref([])

    onSnapshot(
        doc(db, 'users', id),
        { includeMetadataChanges: true },
        (doc) => {
            userQuestOrder.value = doc.data().order
        }
    )
    console.log(userQuestOrder)

    return userQuestOrder
};

export const deleteUser = (id) => {
  return usertsCollection.doc(id).delete();
};

export const updateUser = (id, user) => {
  return usertsCollection.doc(id).undate(user);
};

export const useLoadUsers = () => {
  const users = ref([]);
  const close = onSnapshot(collection(db, "users"), (querySnapshot) => {
    users.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

  onUnmounted(close);
  return users;
};

// GET GENERAL SETTINGS
export const getGeneralSettings = () => {
  const settings = reactive({
    data: null,
  });
  const close = onSnapshot(collection(db, "general"), (querySnapshot) => {
    console.log(querySnapshot.docs[0].data());
    settings.data = querySnapshot.docs[0].data();
  });

  onUnmounted(close);
  return settings;
};

// QUESTS API
export const getQuests = () => {
  const quests = ref([]);
  const close = onSnapshot(collection(db, "quests"), (querySnapshot) => {
    quests.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

  onUnmounted(close);
  return quests;
};
