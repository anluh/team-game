import { onUnmounted, ref, reactive } from "vue";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
  getDoc,
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
            if (doc.exists()) {
                const userData = doc.data()
                userQuestOrder.value = userData?.order || []
                console.log('User quest order loaded:', userQuestOrder.value)
            } else {
                console.log('User document does not exist:', id)
                // Clear session storage and signal that user was deleted
                window.sessionStorage.removeItem('user')
                userQuestOrder.value = null // Use null to indicate user was deleted
            }
        },
        (error) => {
            console.error('Error loading user quest order:', error)
            userQuestOrder.value = []
        }
    )

    return userQuestOrder
};

export const deleteUser = async (id) => {
  try {
    await deleteDoc(doc(db, "users", id));
    console.log("User deleted successfully");
  } catch (error) {
    console.error("Error deleting user: ", error);
    throw error;
  }
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

// CRUD QUESTIONS/QUESTS
export const createQuest = async (questData) => {
  try {
    const docRef = await addDoc(collection(db, "quests"), questData);
    
    // Update all user orders after adding new quest
    await updateAllUserOrders();
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding quest: ", error);
    throw error;
  }
};

export const updateQuest = async (questId, questData) => {
  try {
    const questRef = doc(db, "quests", questId);
    await updateDoc(questRef, questData);
  } catch (error) {
    console.error("Error updating quest: ", error);
    throw error;
  }
};

export const deleteQuest = async (questId) => {
  try {
    const questRef = doc(db, "quests", questId);
    await deleteDoc(questRef);
    
    // Update all user orders after deletion
    await updateAllUserOrders();
  } catch (error) {
    console.error("Error deleting quest: ", error);
    throw error;
  }
};

// HELPER FUNCTIONS FOR ORDER MANAGEMENT

// Fisher-Yates shuffle algorithm to randomize array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate unique orders for all users
const generateUniqueOrders = (questIds, userCount) => {
  const orders = [];
  const maxAttempts = 1000; // Prevent infinite loop
  
  for (let i = 0; i < userCount; i++) {
    let attempts = 0;
    let newOrder;
    let isUnique = false;
    
    do {
      newOrder = shuffleArray(questIds);
      isUnique = !orders.some(existingOrder => 
        existingOrder.length === newOrder.length &&
        existingOrder.every((val, index) => val === newOrder[index])
      );
      attempts++;
    } while (!isUnique && attempts < maxAttempts);
    
    // If we can't find a unique order after maxAttempts, just use the shuffled one
    // This can happen if there are more users than possible unique permutations
    orders.push(newOrder);
  }
  
  return orders;
};

// Update all user orders with new randomized sequences
export const updateAllUserOrders = async () => {
  try {
    console.log("Updating all user orders...");
    
    // Get all quests and users
    const questsSnapshot = await getDocs(collection(db, "quests"));
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    const questIds = questsSnapshot.docs.map(doc => doc.id);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${questIds.length} quests and ${users.length} users`);
    
    if (questIds.length === 0) {
      console.log("No quests found, clearing all user orders");
      // If no quests, clear all orders
      const batch = writeBatch(db);
      users.forEach(user => {
        const userRef = doc(db, "users", user.id);
        batch.update(userRef, { order: [] });
      });
      await batch.commit();
      return;
    }
    
    if (users.length === 0) {
      console.log("No users found, nothing to update");
      return;
    }
    
    // Generate unique orders for all users
    const uniqueOrders = generateUniqueOrders(questIds, users.length);
    
    // Update all users with new orders using batch
    const batch = writeBatch(db);
    users.forEach((user, index) => {
      const userRef = doc(db, "users", user.id);
      batch.update(userRef, { order: uniqueOrders[index] });
    });
    
    await batch.commit();
    console.log("Successfully updated all user orders");
    
  } catch (error) {
    console.error("Error updating user orders: ", error);
    throw error;
  }
};

// Function to update user order when a new user is created
export const generateOrderForNewUser = async () => {
  try {
    // Get all current quests
    const questsSnapshot = await getDocs(collection(db, "quests"));
    const questIds = questsSnapshot.docs.map(doc => doc.id);
    
    if (questIds.length === 0) {
      return [];
    }
    
    // Get all existing users to avoid duplicate orders
    const usersSnapshot = await getDocs(collection(db, "users"));
    const existingOrders = usersSnapshot.docs
      .map(doc => doc.data().order)
      .filter(order => order && order.length === questIds.length);
    
    // Generate a unique order for the new user
    let newOrder;
    let attempts = 0;
    const maxAttempts = 1000;
    
    do {
      newOrder = shuffleArray(questIds);
      attempts++;
    } while (
      attempts < maxAttempts &&
      existingOrders.some(existingOrder => 
        existingOrder.length === newOrder.length &&
        existingOrder.every((val, index) => val === newOrder[index])
      )
    );
    
    return newOrder;
  } catch (error) {
    console.error("Error generating order for new user: ", error);
    return shuffleArray(questIds); // Fallback to simple shuffle
  }
};

// Function to update user's current quest progress
export const updateUserProgress = async (userId, currentQuestIndex) => {
  try {
    const userRef = doc(db, "users", userId);
    
    // Get user data to check if they're completing all questions
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    const userOrder = userData?.order || [];
    
    // Check if this update represents completion of all questions
    const isCompletion = userOrder.length > 0 && currentQuestIndex >= userOrder.length;
    
    const updateData = {
      currentQuestIndex: currentQuestIndex,
      lastUpdated: Date.now()
    };
    
    // Add completion timestamp if team has finished all questions
    if (isCompletion) {
      updateData.completedAt = Date.now();
      updateData.isCompleted = true;
      console.log("Team completed all questions:", userId);
    }
    
    await updateDoc(userRef, updateData);
    console.log("User progress updated:", { userId, currentQuestIndex, isCompletion });
  } catch (error) {
    console.error("Error updating user progress:", error);
    throw error;
  }
};

// Function to update team name
export const updateTeamName = async (userId, newName) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { 
      name: newName,
      lastUpdated: Date.now()
    });
    console.log("Team name updated:", { userId, newName });
  } catch (error) {
    console.error("Error updating team name:", error);
    throw error;
  }
};

// Function to get user's current progress
export const getUserProgress = (id) => {
    const userProgress = ref({
        currentQuestIndex: 0,
        order: [],
        userData: null
    })

    onSnapshot(
        doc(db, 'users', id),
        { includeMetadataChanges: true },
        (doc) => {
            if (doc.exists()) {
                const userData = doc.data()
                userProgress.value = {
                    currentQuestIndex: userData?.currentQuestIndex || 0,
                    order: userData?.order || [],
                    userData: userData
                }
                console.log('User progress loaded:', userProgress.value)
            } else {
                console.log('User document does not exist:', id)
                // Clear session storage and signal that user was deleted
                window.sessionStorage.removeItem('user')
                userProgress.value = null // Use null to indicate user was deleted
            }
        },
        (error) => {
            console.error('Error loading user progress:', error)
            userProgress.value = {
                currentQuestIndex: 0,
                order: [],
                userData: null
            }
        }
    )

    return userProgress
};

// GAME STATE MANAGEMENT
export const startGame = async () => {
  try {
    console.log("Attempting to start game...");
    
    // Try to update existing document first
    const gameStateRef = doc(db, "gameState", "current");
    
    try {
      await updateDoc(gameStateRef, {
        isStarted: true,
        startTime: Date.now(),
        status: "active"
      });
      console.log("Game started successfully - updated existing document");
    } catch (updateError) {
      console.log("Document doesn't exist, creating new one...", updateError);
      
      // If document doesn't exist, use setDoc instead of addDoc
      await setDoc(gameStateRef, {
        isStarted: true,
        startTime: Date.now(),
        status: "active"
      });
      console.log("Game state created and started with setDoc");
    }
  } catch (error) {
    console.error("Error starting game: ", error);
    throw error;
  }
};

export const stopGame = async () => {
  try {
    console.log("Attempting to stop game...");
    const gameStateRef = doc(db, "gameState", "current");
    await updateDoc(gameStateRef, {
      isStarted: false,
      endTime: Date.now(),
      status: "stopped"
    });
    console.log("Game stopped successfully");
  } catch (error) {
    console.error("Error stopping game: ", error);
    throw error;
  }
};

export const getGameState = () => {
  const gameState = ref({
    isStarted: false,
    startTime: null,
    endTime: null,
    status: "waiting"
  });
  
  const close = onSnapshot(
    doc(db, "gameState", "current"),
    (doc) => {
      console.log("Game state snapshot received:", doc.exists(), doc.data());
      if (doc.exists()) {
        gameState.value = doc.data();
        console.log("Game state updated:", gameState.value);
      } else {
        console.log("Game state document doesn't exist");
        gameState.value = {
          isStarted: false,
          startTime: null,
          endTime: null,
          status: "waiting"
        };
      }
    },
    (error) => {
      console.error("Error loading game state:", error);
    }
  );

  onUnmounted(close);
  return gameState;
};

// NOTIFICATION SYSTEM
export const sendNotificationToTeam = async (teamId, message) => {
  try {
    const notificationRef = doc(db, "teamNotifications", teamId);
    await setDoc(notificationRef, {
      teamId: teamId,
      message: message,
      timestamp: Date.now(),
      isActive: true,
      response: null
    });
    console.log("Notification sent to team:", teamId);
  } catch (error) {
    console.error("Error sending notification to team:", error);
    throw error;
  }
};

export const sendNotificationToAllTeams = async (message) => {
  try {
    // Get all users first
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Use batch to send to all teams
    const batch = writeBatch(db);
    
    users.forEach(user => {
      const notificationRef = doc(db, "teamNotifications", user.id);
      batch.set(notificationRef, {
        teamId: user.id,
        message: message,
        timestamp: Date.now(),
        isActive: true,
        response: null
      });
    });
    
    await batch.commit();
    console.log("Notification sent to all teams");
  } catch (error) {
    console.error("Error sending notification to all teams:", error);
    throw error;
  }
};

export const respondToTeamNotification = async (teamId, answer) => {
  try {
    const notificationRef = doc(db, "teamNotifications", teamId);
    await updateDoc(notificationRef, {
      response: {
        answer: answer,
        timestamp: Date.now()
      }
    });
    console.log("Response recorded for team:", teamId, "Answer:", answer);
  } catch (error) {
    console.error("Error responding to notification:", error);
    throw error;
  }
};

export const clearTeamNotification = async (teamId) => {
  try {
    const notificationRef = doc(db, "teamNotifications", teamId);
    await updateDoc(notificationRef, {
      isActive: false,
      clearedAt: Date.now()
    });
    console.log("Notification cleared for team:", teamId);
  } catch (error) {
    console.error("Error clearing notification:", error);
    throw error;
  }
};

export const getTeamNotification = (teamId) => {
  const notification = ref(null);
  
  const close = onSnapshot(
    doc(db, "teamNotifications", teamId),
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        notification.value = data.isActive ? data : null;
      } else {
        notification.value = null;
      }
    },
    (error) => {
      console.error("Error loading team notification:", error);
      notification.value = null;
    }
  );

  onUnmounted(close);
  return notification;
};

export const getAllTeamNotifications = () => {
  const notifications = ref([]);
  
  const close = onSnapshot(
    collection(db, "teamNotifications"),
    (querySnapshot) => {
      notifications.value = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(notification => notification.isActive);
    },
    (error) => {
      console.error("Error loading team notifications:", error);
      notifications.value = [];
    }
  );

  onUnmounted(close);
  return notifications;
};

// Legacy function for backward compatibility
export const getCurrentNotification = () => {
  return ref(null);
};
