import { createWebHistory, createRouter } from "vue-router";
import Home from "@/views/HomePage.vue";
import Quests from "@/views/QuestsPage.vue";
import Admin from "@/views/AdminPage.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/admin",
    name: "Admin",
    component: Admin,
  },
  {
    path: "/quests",
    name: "Quests",
    component: Quests,
  },
  {
    path: "/quests/:userId",
    name: "QuestsWithUser",
    component: Quests,
    props: true
  },
  
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Utility function to clear all storage data
const clearAllStorageData = () => {
  try {
    // Clear sessionStorage
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('adminAuthenticated')
    
    // Clear localStorage (if any game data is stored there)
    localStorage.removeItem('user')
    localStorage.removeItem('teamData')
    localStorage.removeItem('gameData')
    
    console.log('Router: All storage data cleared')
  } catch (error) {
    console.error('Router: Error clearing storage:', error)
  }
}

// Navigation guard to redirect to user's questions page if user is already set
router.beforeEach((to, from, next) => {
  const userId = window.sessionStorage.getItem('user');
  
  // If user exists and they're not already going to their questions page or admin page
  if (userId && 
      to.name !== 'QuestsWithUser' && 
      to.name !== 'Admin' && 
      to.params.userId !== userId) {
    
    // Redirect to their specific questions page
    // Note: If user was deleted, the QuestsPage will handle the cleanup and redirect
    console.log('Router: Redirecting user to their quests page:', userId)
    next({ name: 'QuestsWithUser', params: { userId } });
  } else if (to.name === 'QuestsWithUser' && to.params.userId && !userId) {
    // If accessing quest page with userId param but no stored user, clear storage and redirect to home
    console.log('Router: No stored user but accessing quest page, clearing storage and redirecting to home')
    clearAllStorageData()
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;